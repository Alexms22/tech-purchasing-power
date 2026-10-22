// =====================================================================
// Nó: String Manipulation  (Node-RED, tipo function)
// Fluxo: Recebe dados da API e envia SMS para RabbitMQ
// Extraído de node_red/flows.json para documentação e revisão.
// =====================================================================

msg.url = "https://www.reed.co.uk/api/1.0/search?keywords=" + encodeURIComponent(msg.payload.keyword);
return msg;
