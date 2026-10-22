-- =====================================================================
-- Tech Purchasing Power - Estrutura da base de dados
-- =====================================================================
-- Este script é executado automaticamente pelo contentor PostgreSQL na
-- PRIMEIRA inicialização (volume pgdata vazio), via docker-entrypoint-initdb.d.
--
-- Para o correr manualmente numa BD já existente:
--   docker exec -i tech_power_db psql -U $DB_USER -d $DB_NAME < 01_init_tables.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ofertas_emprego  --  via BATCH (KNIME)
-- ---------------------------------------------------------------------
-- Escrita pelo nó DB Writer do KNIME em modo de substituição: a tabela é
-- reposta por inteiro em cada execução do ciclo horário. A definição abaixo
-- serve de documentação e de arranque a frio; o KNIME recria-a conforme o
-- esquema de saída do workflow.
--
-- NOTA: os nomes das colunas combinam maiúsculas e minúsculas (e incluem
-- acentos), pelo que EXIGEM aspas duplas em todas as consultas:
--     SELECT "Pais_Numbeo" FROM ofertas_emprego;
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ofertas_emprego (
    "Titulo_Vaga"                   varchar,
    "Localizacao"                   varchar,
    "Salario_Euros"                 double precision,
    "Nivel_Experiencia"             varchar,
    "Tipo_Mercado"                  varchar,
    "Pais_Numbeo"                   varchar,
    "Indice_Custo_Vida"             double precision,
    "Indice_de_Renda"               double precision,
    "Indice_Custo_Vida_Mais_Renda"  double precision,
    "Taxa_Imposto"                  double precision,
    "Poupança Anual Estimada (€)"   double precision
);

-- Índices de apoio às agregações do dashboard (filtros por país e senioridade)
CREATE INDEX IF NOT EXISTS idx_ofertas_pais
    ON ofertas_emprego ("Pais_Numbeo");
CREATE INDEX IF NOT EXISTS idx_ofertas_nivel
    ON ofertas_emprego ("Nivel_Experiencia");

-- ---------------------------------------------------------------------
-- 2. vagas_nodered  --  via STREAMING (Node-RED)
-- ---------------------------------------------------------------------
-- Tabela separada e OBRIGATÓRIA: o DB Writer do KNIME repõe a tabela
-- ofertas_emprego a cada ciclo, o que apagaria os registos capturados em
-- tempo real se ambas as vias partilhassem o mesmo destino.
--
-- Nomes em minúsculas, para coincidir com a normalização interna do
-- PostgreSQL e dispensar aspas na query do nó TechPowerPostgres.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vagas_nodered (
    titulo_vaga        varchar(255),
    localizacao        varchar(255),
    salario_euros      double precision,
    nivel_experiencia  varchar(255),
    tipo_mercado       varchar(255)
);

-- Restrição de unicidade que suporta o upsert (ON CONFLICT DO UPDATE)
-- executado pelo nó TechPowerPostgres a cada ciclo horário.
ALTER TABLE vagas_nodered
    DROP CONSTRAINT IF EXISTS vaga_unica;
ALTER TABLE vagas_nodered
    ADD CONSTRAINT vaga_unica UNIQUE (titulo_vaga, localizacao);
