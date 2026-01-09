const https = require('https');

const BASE_URL = 'https://analisisinteligente-mmg7x0ceu-muestreos-projects.vercel.app/api/sampling_proxy';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 400) reject(`HTTP ${res.statusCode}: ${data}`);
                    else resolve(JSON.parse(data));
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function run() {
    console.log("1. Fetching Populations...");
    try {
        const popRes = await fetchJson(`${BASE_URL}?action=get_populations`);
        if (!popRes.data || popRes.data.length === 0) throw new Error("No populations found");

        const popId = popRes.data[0].id; // Use first pop
        console.log(`   Found Population ID: ${popId}`);

        console.log("2. Testing 'get_smart_sample'...");
        const start = Date.now();
        const sampleRes = await fetchJson(`${BASE_URL}?action=get_smart_sample&population_id=${popId}&sample_size=30`);
        const duration = Date.now() - start;

        console.log(`   Response Time: ${duration}ms`);

        if (!sampleRes.rows) {
            console.error("FAIL: 'rows' not in response.", sampleRes);
        } else {
            console.log(`   Success! Received ${sampleRes.rows.length} rows.`);
            if (sampleRes.rows.length > 0) {
                const first = sampleRes.rows[0];
                console.log("   First Item Risk Score:", first.risk_score);
                if (first.risk_json || first.raw_json) console.log("   Includes Raw Data: YES");
                else console.log("   Includes Raw Data: NO");
            }
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
