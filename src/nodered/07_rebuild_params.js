// =====================================================================
// Nó: Rebuild Params  (Node-RED, tipo function)
// Fluxo: Insere dados na BD
// Extraído de node_red/flows.json para documentação e revisão.
// =====================================================================

let dados = msg.payload;

// 1. Converter o Buffer para texto
if (Buffer.isBuffer(dados)) {
    dados = dados.toString();
}

// 2. Converter o texto de volta para Array
if (typeof dados === 'string') {
    try {
        dados = JSON.parse(dados);
    } catch (e) {
        return null; // Descarta se não for JSON válido
    }
}

// 3. Garantir que é mesmo um array (protege contra erros antigos na fila)
if (!Array.isArray(dados)) {
    return null;
}

// 4. Parâmetros blindados com valores por defeito para evitar erros de SQL
let parametrosFinais = [
    dados[0] || "Sem Titulo", 
    dados[1] || "Desconhecido", 
    Number(dados[2]) || 0,      
    dados[3] || "N/A",          
    dados[4] || "N/A"           
];

msg.params = parametrosFinais;
msg.payload = parametrosFinais; 

return msg;
