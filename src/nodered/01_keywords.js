// =====================================================================
// Nó: Keywords  (Node-RED, tipo function)
// Fluxo: Recebe dados da API e envia SMS para RabbitMQ
// Extraído de node_red/flows.json para documentação e revisão.
// =====================================================================

msg.payload = [
    { keyword: "AI" },
    { keyword: "Data Science" },
    { keyword: "Cloud Engineer" },
    { keyword: "Frontend Developer" },
    { keyword: "Backend Developer" },
    { keyword: "Fullstack Developer" },
    { keyword: "Software Developer" },
    { keyword: "Developer" },
    { keyword: "Software" },
    { keyword: "IT" },
    { keyword: "Machine Learning" },
    { keyword: "Tester" }
];
return msg;
