
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { population_id, method, sample_data, is_final } = req.body;

    if (!population_id || !method || !sample_data) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase Config');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. If Final, archive previous current sample
        if (is_final) {
            await supabase
                .from('audit_historical_samples')
                .update({ is_current: false })
                .eq('population_id', population_id)
                .eq('is_current', true);
        }

        // 2. Insert new sample
        const payload = {
            population_id,
            method,
            objective: sample_data.objective,
            seed: sample_data.seed,
            sample_size: sample_data.sample_size,
            params_snapshot: sample_data.params_snapshot,
            results_snapshot: sample_data.results_snapshot, // Includes observations
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

    } catch (error) {
        console.error('[Save Sample Proxy Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
