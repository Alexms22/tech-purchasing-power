// =====================================================================
// Nó: Extract Country  (Node-RED, tipo function)
// Fluxo: Recebe dados da API e envia SMS para RabbitMQ
// Extraído de node_red/flows.json para documentação e revisão.
// =====================================================================

// 1. Recuperar a vaga original do "bolso"
let vaga = msg.vaga_original;

// 2. Extrair o país da resposta da API (postcodes.io)
let pais = "United Kingdom"; // Valor de salvaguarda caso a API falhe
if (msg.payload && msg.payload.result && msg.payload.result.country) {
    pais = msg.payload.result.country;
}

// 3. Substituir o código postal pelo país descoberto
vaga.locationName = pais;

// 4. Restaurar o payload com a vaga atualizada
msg.payload = vaga;

return msg;
