-- =====================================================================
-- Consultas dos painéis do dashboard Tech Power Purchasing (Grafana)
-- Extraídas de grafana/dashboards/tech_power_purchasing.json
--
-- NOTA: os nomes das colunas de ofertas_emprego combinam maiúsculas,
-- minúsculas e acentos, pelo que exigem sempre aspas duplas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Top 10 Países com Maior Poupança Anual
-- Destaca os dez mercados onde o poder de compra real é mais vantajoso, ordenando os países pela maior margem financeira que o trabalhador consegue rete
-- ---------------------------------------------------------------------
SELECT 
  "Pais_Numbeo" as "País", 
  ROUND(AVG("Poupança Anual Estimada (€)")::numeric, 2) as "Poupança Média Anual (€)"
FROM ofertas_emprego
WHERE "Poupança Anual Estimada (€)" IS NOT NULL
GROUP BY "Pais_Numbeo"
ORDER BY "Poupança Média Anual (€)" DESC
LIMIT 10;

-- ---------------------------------------------------------------------
-- Poder de Compra - Média Salarial Anual
-- Compara diretamente a média dos salários anuais (já convertidos para Euros) entre os diferentes países ou níveis de experiência.
-- ---------------------------------------------------------------------
SELECT 
  "Pais_Numbeo" as "País", 
  ROUND(AVG("Salario_Euros")::numeric, 2) as "Salário Médio (€)"
FROM ofertas_emprego
WHERE "Salario_Euros" > 0 
GROUP BY "Pais_Numbeo"
ORDER BY "Salário Médio (€)" DESC;

-- ---------------------------------------------------------------------
-- Salários por País e Senioridade
-- Uma tabela analítica de resumo que cruza o país com a senioridade, exibindo o volume de vagas e os valores salariais mínimos, médios e máximos para um
-- ---------------------------------------------------------------------
SELECT 
  "Pais_Numbeo" as "País",
  "Nivel_Experiencia" as "Senioridade",
  COUNT("Titulo_Vaga") as "Total de Vagas",
  ROUND(MIN("Salario_Euros")::numeric, 0) as "Salário Mínimo (€)",
  ROUND(AVG("Salario_Euros")::numeric, 0) as "Salário Médio (€)",
  ROUND(MAX("Salario_Euros")::numeric, 0) as "Salário Máximo (€)"
FROM ofertas_emprego
WHERE "Salario_Euros" > 0
GROUP BY "Pais_Numbeo", "Nivel_Experiencia"
ORDER BY "Salário Médio (€)" DESC;

-- ---------------------------------------------------------------------
-- Distribuição de Vagas por País
-- Mostra o volume absoluto e a percentagem de ofertas de emprego disponíveis em cada país, ajustando-se aos filtros aplicados.
-- ---------------------------------------------------------------------
SELECT 
  "Pais_Numbeo" as "País", 
  COUNT("Titulo_Vaga") as "Total de Vagas"
FROM ofertas_emprego
GROUP BY "Pais_Numbeo"
ORDER BY "Total de Vagas" DESC;
