
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { population_id } = req.query;

    if (!population_id) {
        return res.status(400).json({ error: 'Missing population_id' });
    }

    try {
        if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase Config');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch ALL rows (or up to a reasonable limit for serverless, e.g., 20k)
        // Vercel functions have timeout limits, so for VERY large datasets, pagination would be needed.
        // For now, 20k limit covers most audit pilots.
        const { data, error } = await supabase
            .from('audit_data_rows')
            .select('unique_id_col, monetary_value_col, raw_json')
            .eq('population_id', population_id)
            .limit(20000);

        if (error) throw error;

        return res.status(200).json({ rows: data });

    } catch (error) {
        console.error('[Get Universe Proxy Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
