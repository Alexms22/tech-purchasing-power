// =====================================================================
// Nó: Normal Data  (Node-RED, tipo function)
// Fluxo: Recebe dados da API e envia SMS para RabbitMQ
// Extraído de node_red/flows.json para documentação e revisão.
// =====================================================================

let vaga = msg.payload.results ? msg.payload.results : msg.payload;

let salario_libras = vaga.minimumSalary || vaga.maximumSalary || 0;

// 1. FILTRO DE QUALIDADE (Gatekeeper)
if (salario_libras === 0 || !vaga.jobTitle) {
    return null; // Descarta anúncios inválidos e pára o fluxo
}

// 2. NORMALIZAÇÃO DE SALÁRIOS (Lógica Inteligente)
if (salario_libras > 0 && salario_libras < 100) {
    salario_libras = salario_libras * 1950;
} else if (salario_libras >= 100 && salario_libras <= 1500) {
    salario_libras = salario_libras * 260;
} else if (salario_libras > 1500 && salario_libras <= 10000) {
    salario_libras = salario_libras * 12;
}

let salario_euros = Math.round(salario_libras * 1.17);

// 3. NORMALIZAÇÃO DE LOCALIZAÇÃO (Filtro Supremo)
let localizacao_original = vaga.locationName || "Desconhecido";
let locLower = localizacao_original.toLowerCase();

// Regra base: Tudo é assumido como Reino Unido (mata códigos postais e cidades inglesas)
let pais_final = "United Kingdom";

// Exceção: Apenas se detetar a Irlanda é que altera
if (locLower.includes("ireland") || locLower.includes("dublin") || locLower.includes("cork") || locLower.includes("galway")) {
    pais_final = "Ireland";
}

// 4. MAPEAR PARA O POSTGRESQL E TELEGRAM (Array exato de 5 posições)
let valores = [
    vaga.jobTitle,
    pais_final,      // $2
    salario_euros,   // $3
    "Mid",           // $4
    "Mercado Local / Standard" // $5
];

msg.payload = valores;
return msg;
