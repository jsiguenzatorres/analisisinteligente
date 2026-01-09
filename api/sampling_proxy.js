import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { action } = req.query;

    try {
        if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase Config');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // --- GET Actions ---
        if (req.method === 'GET') {
            // Actions independent of population_id
            if (action === 'get_users') {
                const { data: { users }, error } = await supabase.auth.admin.listUsers();
                if (error) throw error;
                return res.status(200).json({ users });

            } else if (action === 'get_populations') {
                const { data, error } = await supabase
                    .from('audit_populations')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return res.status(200).json({ populations: data });
            }

            // Actions requiring population_id
            const { population_id } = req.query;
            if (!population_id) return res.status(400).json({ error: 'Missing population_id' });

            if (action === 'get_universe') {
                // LIGHT PAYLOAD LOGIC
                // Optimization: Exclude 'risk_factors' (Text Array) by default to prevent Vercel 4.5MB Limit.
                // Only unique_id, value, and risk_score are strictly needed for most algorithms.
                const { detailed, include_factors } = req.query;

                let selectColumns = 'unique_id_col, monetary_value_col, risk_score';

                if (detailed === 'true') {
                    selectColumns += ', risk_factors, raw_json';
                } else if (include_factors === 'true') {
                    selectColumns += ', risk_factors';
                }

                const { data, error } = await supabase
                    .from('audit_data_rows')
                    .select(selectColumns)
                    .eq('population_id', population_id)
                    .limit(20000);
                if (error) throw error;
                return res.status(200).json({ rows: data });

            } else if (action === 'get_smart_sample') {
                // SERVER-SIDE SAMPLING (Risk Based)
                // Returns top N riskiest items directly from DB to avoid browser processing of 20k rows.
                const { sample_size } = req.query; // population_id already declared above
                const limit = parseInt(sample_size) || 30;

                const { data, error } = await supabase
                    .from('audit_data_rows')
                    .select('unique_id_col, monetary_value_col, risk_score, risk_factors, raw_json')
                    .eq('population_id', population_id)
                    .order('risk_score', { ascending: false })
                    .limit(limit);

                if (error) throw error;
                return res.status(200).json({ rows: data });

            } else if (action === 'get_history') {
                const { data, error } = await supabase
                    .from('audit_historical_samples')
                    .select('*')
                    .eq('population_id', population_id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return res.status(200).json({ history: data });

            } else if (action === 'get_all_results') {
                const { data, error } = await supabase
                    .from('audit_results')
                    .select('results_json, population_id')
                    .eq('population_id', population_id);
                if (error) throw error;
                return res.status(200).json({ results: data });

            } else if (action === 'get_observations') {
                const { data, error } = await supabase
                    .from('observaciones_auditoria')
                    .select('*')
                    .eq('id_poblacion', population_id)
                    .order('fecha_creacion', { ascending: false });
                if (error) throw error;
                return res.status(200).json({ observations: data });

            } else {
                return res.status(400).json({ error: 'Invalid GET action' });
            }
        }

        // --- POST Actions ---
        else if (req.method === 'POST') {
            if (action === 'save_sample') {
                const { population_id, method, sample_data, is_final } = req.body;
                if (!population_id || !method || !sample_data) return res.status(400).json({ error: 'Missing required fields' });

                if (is_final) {
                    await supabase
                        .from('audit_historical_samples')
                        .update({ is_current: false })
                        .eq('population_id', population_id)
                        .eq('is_current', true);
                }

                const payload = {
                    population_id,
                    method,
                    objective: sample_data.objective,
                    seed: sample_data.seed,
                    sample_size: sample_data.sample_size,
                    params_snapshot: sample_data.params_snapshot,
                    results_snapshot: sample_data.results_snapshot,
                    is_final: !!is_final,
                    is_current: !!is_final
                };

                const { data, error } = await supabase
                    .from('audit_historical_samples')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                return res.status(200).json(data);

            } else if (action === 'save_work_in_progress') {
                const { population_id, results_json, sample_size } = req.body;
                if (!population_id || !results_json) return res.status(400).json({ error: 'Missing required fields' });

                const { data, error } = await supabase
                    .from('audit_results')
                    .upsert({
                        population_id, results_json, sample_size, updated_at: new Date().toISOString()
                    }, { onConflict: 'population_id' })
                    .select();
                if (error) throw error;
                return res.status(200).json(data);

            } else if (action === 'delete_population') {
                const { population_id } = req.body;
                if (!population_id) return res.status(400).json({ error: 'Missing population_id' });
                const { error } = await supabase.from('audit_populations').delete().eq('id', population_id);
                if (error) throw error;
                return res.status(200).json({ success: true });

            } else if (action === 'toggle_user_status') {
                const { user_id, status } = req.body;
                if (!user_id || typeof status === 'undefined') return res.status(400).json({ error: 'Missing args' });
                const { data, error } = await supabase.from('profiles').update({ is_active: status }).eq('id', user_id).select();
                if (error) throw error;
                return res.status(200).json({ data });

            } else if (action === 'sync_chunk') {
                const { rows } = req.body;
                if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: 'Invalid rows' });
                const { data, error } = await supabase.from('audit_data_rows').insert(rows).select('id');
                if (error) throw error;
                return res.status(200).json({ success: true, count: rows.length });

            } else if (action === 'save_observation') {
                const { id, ...payload } = req.body;
                let error;
                if (id) {
                    const { error: err } = await supabase.from('observaciones_auditoria').update(payload).eq('id', id);
                    error = err;
                } else {
                    const { error: err } = await supabase.from('observaciones_auditoria').insert(payload);
                    error = err;
                }
                if (error) throw error;
                return res.status(200).json({ success: true });

            } else if (action === 'delete_observation') {
                const { id } = req.body;
                if (!id) return res.status(400).json({ error: 'Missing id' });
                const { error } = await supabase.from('observaciones_auditoria').delete().eq('id', id);
                if (error) throw error;
                return res.status(200).json({ success: true });

            } else if (action === 'get_rows_batch') {
                const { population_id, ids } = req.body;
                if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });
                const { data, error } = await supabase
                    .from('audit_data_rows')
                    // Now including risk_factors in hydration since we excluded it from universe
                    .select('unique_id_col, raw_json, risk_factors')
                    .eq('population_id', population_id)
                    .in('unique_id_col', ids);
                if (error) throw error;
                return res.status(200).json({ rows: data });

            } else {
                return res.status(400).json({ error: 'Invalid POST action' });
            }
        }

        else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('[Sampling Proxy Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
