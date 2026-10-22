// =====================================================================
// Nó: Postal Code Filter  (Node-RED, tipo function)
// Fluxo: Recebe dados da API e envia SMS para RabbitMQ
// Extraído de node_red/flows.json para documentação e revisão.
// =====================================================================

// Garantir que lemos a vaga quer venha encapsulada em 'results' ou não
let vaga = msg.payload.results ? msg.payload.results : msg.payload;

// 1. Guardamos a vaga original num "bolso" seguro chamado msg.vaga_original
msg.vaga_original = vaga;

// 2. Limpamos o código postal (exatamente igual ao teu regexReplace do KNIME)
let localizacao = vaga.locationName || "";
let cp = localizacao.replace(/[^a-zA-Z0-9]/g, "");

// 3. Criamos o URL dinâmico para o nó HTTP
msg.url = "https://api.postcodes.io/postcodes/" + cp;

return msg;
