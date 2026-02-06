const https = require('https');
https.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
        const muns = JSON.parse(data);
        const rp = muns.find(m => m.nome === 'Ribeirão Preto');
        if (rp) {
            console.log("Mesorregiao ID:", rp.microrregiao.mesorregiao.id);
            console.log("Mesorregiao Nome:", rp.microrregiao.mesorregiao.nome);
            console.log("Microrregiao ID:", rp.microrregiao.id);
        } else {
            console.log("Cidade não encontrada");
        }
    } catch (e) { console.log("Erro parsing:", e); }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
