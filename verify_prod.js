
const https = require('https');

const url = "https://analisisinteligente.vercel.app/api/sampling_proxy?action=get_universe&population_id=d80e5-548147d1c356";

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.rows && json.rows.length > 0) {
                const keys = Object.keys(json.rows[0]);
                console.log("Keys found:", keys.join(", "));
                if (keys.includes("risk_factors")) {
                    console.log("FAILURE: risk_factors is STILL present.");
                } else {
                    console.log("SUCCESS: risk_factors is ABSENT (Ultra-Light Payload).");
                }
            } else {
                console.log("No rows found or error:", json);
            }
        } catch (e) {
            console.log("Error parsing JSON:", e.message);
            console.log("Raw Data Preview:", data.substring(0, 100));
        }
    });
}).on('error', e => console.error(e));
