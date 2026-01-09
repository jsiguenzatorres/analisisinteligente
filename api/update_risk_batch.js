
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { updates } = req.body;

        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ error: 'Invalid updates payload' });
        }

        // Batch upsert in chunks of 100 to avoid request size limits
        const CHUNK_SIZE = 100;
        const errors = [];

        for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
            const chunk = updates.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase
                .from('audit_data_rows')
                .upsert(chunk, { onConflict: 'id' });

            if (error) {
                console.error('Batch upsert error:', error);
                errors.push(error);
            }
        }

        if (errors.length > 0) {
            return res.status(500).json({ error: 'Partial processing error', details: errors });
        }

        return res.status(200).json({ success: true, count: updates.length });

    } catch (error) {
        console.error('[Update Risk Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
