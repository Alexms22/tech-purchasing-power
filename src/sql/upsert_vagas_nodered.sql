-- =====================================================================
-- Consulta do nó TechPowerPostgres (Node-RED, fluxo consumidor)
-- Escrita por cima (upsert) na tabela vagas_nodered.
-- Parâmetros $1..$5 preenchidos por msg.params (nó Rebuild Params).
-- =====================================================================

INSERT INTO vagas_nodered (titulo_vaga, localizacao, salario_euros, nivel_experiencia, tipo_mercado) 
VALUES ($1, $2, $3, $4, $5) 
ON CONFLICT (titulo_vaga, localizacao) 
DO UPDATE SET 
    salario_euros = EXCLUDED.salario_euros,
    nivel_experiencia = EXCLUDED.nivel_experiencia,
    tipo_mercado = EXCLUDED.tipo_mercado;
