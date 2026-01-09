const https = require('https');

const BASE_URL = 'https://analisisinteligente-mmg7x0ceu-muestreos-projects.vercel.app/api/sampling_proxy';

function fetchJson(url, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) reject({ status: res.statusCode, body: parsed });
                    else resolve(parsed);
                } catch (e) {
                    reject({ status: res.statusCode, raw: data, error: e.message });
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function run() {
    console.log("1. Fetching Populations...");
    try {
        const popRes = await fetchJson(`${BASE_URL}?action=get_populations`, { method: 'GET' });
        const popId = popRes.populations[0].id;
        console.log(`   Found Population ID: ${popId}`);

        console.log("2. Testing 'calculate_sample' (POST)...");
        const payload = JSON.stringify({
            population_id: popId,
            method: 'NonStatistical',
            params: { sampleSize: 15, insight: 'Random' }
        });

        const start = Date.now();
        const sampleRes = await fetchJson(`${BASE_URL}?action=calculate_sample`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            },
            body: payload
        });
        const duration = Date.now() - start;

        console.log(`   Response Time: ${duration}ms`);
        console.log(`   Rows Received: ${sampleRes.rows?.length}`);

        if (sampleRes.rows?.length > 0) {
            console.log("   First Row Risk Score:", sampleRes.rows[0].risk_score);
            console.log("SUCCESS: Backend is working.");
        } else {
            console.error("FAILURE: No rows returned.", sampleRes);
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
