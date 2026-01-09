
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
            const { population_id } = req.query;
            if (!population_id) return res.status(400).json({ error: 'Missing population_id' });

            if (action === 'get_universe') {
                // From get_universe.js
                const { data, error } = await supabase
                    .from('audit_data_rows')
                    .select('unique_id_col, monetary_value_col, raw_json')
                    .eq('population_id', population_id)
                    .limit(20000);
                if (error) throw error;
                return res.status(200).json({ rows: data });

            } else if (action === 'get_history') {
                // From get_sample_history.js
                const { data, error } = await supabase
                    .from('audit_historical_samples')
                    .select('*')
                    .eq('population_id', population_id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return res.status(200).json({ history: data });

            } else if (action === 'get_populations') {
                const { data, error } = await supabase
                    .from('audit_populations')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return res.status(200).json({ populations: data });

            } else if (action === 'get_all_results') {
                const { data, error } = await supabase
                    .from('audit_results')
                    .select('results_json, population_id');
                if (error) throw error;
                return res.status(200).json({ results: data });

            } else {
                return res.status(400).json({ error: 'Invalid GET action' });
            }
        }

        // --- POST Actions ---
        if (req.method === 'POST') {
            if (action === 'save_sample') {
                // From save_sample.js
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
                        population_id,
                        results_json,
                        sample_size,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'population_id' })
                    .select();

                if (error) throw error;
                return res.status(200).json(data);

            } else {
                return res.status(400).json({ error: 'Invalid POST action' });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('[Sampling Proxy Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
