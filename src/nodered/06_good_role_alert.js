// =====================================================================
// Nó: Good Role Alert  (Node-RED, tipo function)
// Fluxo: Recebe dados da API e envia SMS para RabbitMQ
// Extraído de node_red/flows.json para documentação e revisão.
// =====================================================================

// Recuperar os dados com base no array de 6 posições revelado no debug
let titulo = msg.payload[0] || "Desconhecido";
let pais = msg.payload[1] || "Desconhecido";
let salario = Number(msg.payload[2]) || 0;

// Extrair mais informações com base nas posições reveladas no teu array
let experiencia = msg.payload[3] || "N/A";
let mercado = msg.payload[4] || "N/A";

// Aceder à memória do Node-RED para ver quantas vagas já foram geradas (inicia a 0)
let totalAlertas = context.get("contadorVagas") || 0;

// 1. DEFINIR O QUE É UM "VALOR ALTO" (Ex: Salário >= 100.000€)
let isValorAlto = salario >= 100000;

// 2. DEFINIR O QUE É UM "ROLE INCOMUM"
let keywordsRaras = ["cobol", "rust", "blockchain", "machine learning", "quantum", "fortran", "elixir", "power electronics"];
let isRoleIncomum = keywordsRaras.some(palavra => titulo.toLowerCase().includes(palavra));

// 3. SE CUMPRIR UMA DAS REGRAS, GERA O ALERTA
if (isValorAlto || isRoleIncomum) {
    
    // Aumenta o contador de vagas destacadas e guarda o novo valor na memória
    totalAlertas++;
    context.set("contadorVagas", totalAlertas);
    
    // Identificar o motivo do alerta
    let motivo = isValorAlto ? "💰 Alto Valor Financeiro" : "🦄 Vaga Incomum/Rara";
    if (isValorAlto && isRoleIncomum) motivo = "🔥 Jackpot (Rara + Alto Valor)";

    // Estruturar a mensagem para o Telegram com mais detalhes e rodapé
    msg.payload = {
        chat_id: env.get("TELEGRAM_CHAT_ID"),
        text: `🚨 *ALERTA DE VAGA DESTACADA* 🚨\n` +
              `*Motivo:* ${motivo}\n\n` +
              `📋 *Principais Infos:*\n` +
              `• *Cargo:* ${titulo}\n` +
              `• *País:* ${pais}\n` +
              `• *Nível:* ${experiencia}\n` +
              `• *Mercado:* ${mercado}\n` +
              `• *Salário Anual:* ${salario} €\n\n`,
        parse_mode: "Markdown"
    };
    
    // URL construido a partir do .env (o token NUNCA fica no flows.json)
    msg.url = "https://api.telegram.org/bot" + env.get("TELEGRAM_BOT_TOKEN") + "/sendMessage";

    return msg; 
}

// Se não for destacada, ignora
return null;
