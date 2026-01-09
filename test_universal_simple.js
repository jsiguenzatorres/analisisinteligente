// test_universal_simple.js
async function run() {
    const BASE_URL = 'https://analisisinteligente-mmg7x0ceu-muestreos-projects.vercel.app/api/sampling_proxy';

    console.log("1. Buscando Poblaciones...");
    try {
        const respPop = await fetch(`${BASE_URL}?action=get_populations`);
        if (!respPop.ok) throw new Error(`Error Populations: ${respPop.status} ${respPop.statusText}`);

        const dataPop = await respPop.json();
        const pops = dataPop.populations || [];

        if (pops.length === 0) {
            console.error("No populations found.");
            return;
        }

        const popId = pops[0].id;
        console.log(`   ID Encontrado: ${popId}`);

        console.log("2. Probando calculate_sample (NonStatistical)...");
        const payload = {
            population_id: popId,
            method: 'NonStatistical',
            params: { sampleSize: 5, insight: 'Random' }
        };

        const respSample = await fetch(`${BASE_URL}?action=calculate_sample`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!respSample.ok) {
            const errText = await respSample.text();
            throw new Error(`Error Sample: ${respSample.status} - ${errText}`);
        }

        const dataSample = await respSample.json();
        console.log(`   Status: ${respSample.status}`);
        console.log(`   Rows: ${dataSample.rows?.length}`);

        if (dataSample.rows?.length > 0) {
            console.log("   Row 1 Risk Score:", dataSample.rows[0].risk_score);
            console.log("✅ BACKEND OPERATIVO");
        } else {
            console.warn("⚠️ BACKEND OK PERO SIN FILAS");
        }

    } catch (e) {
        console.error("❌ ERROR FATAL:", e.message);
    }
}

run();
