
const https = require('https');

https.get('https://analisisinteligente.vercel.app/api/sampling_proxy?action=get_populations', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.populations && json.populations.length > 0) {
                console.log('ID:', json.populations[0].id);
            } else {
                console.log('No populations found');
            }
        } catch (e) {
            console.error('Error parsing:', e);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
