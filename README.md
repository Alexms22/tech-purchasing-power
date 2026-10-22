# Tech Purchasing Power

**Pipeline ETL para Análise do Poder de Compra no Setor Tecnológico**

| | |
|---|---|
| **Unidade Curricular** | Integração de Sistemas de Informação (ISI) |
| **Trabalho** | Trabalho Prático I — ano letivo 2026/2027 |
| **Curso** | Licenciatura em Engenharia de Sistemas Informáticos |
| **Instituição** | Escola Superior de Tecnologia — Universidade Politécnica do Cávado e do Ave (UPCA) |
| **Autor** | Alexandre Silva — n.º 29382 |
| **Orientação** | Luís Ferreira |

### 🎥 Vídeo de demonstração

**https://… (a preencher)**

---

## 1. Descrição do Projeto

A decisão de aceitar uma oferta de emprego em Tecnologias de Informação (TI), ou de mudar de país, não deve basear-se apenas no valor bruto anunciado. Comparar ofertas a nível mundial é difícil porque os salários surgem em **moedas diferentes** (libras, euros, dólares), em **periodicidades diferentes** (hora, dia, mês, ano) e com **localizações inconsistentes** (cidades, regiões, códigos postais). Acresce que o salário bruto não reflete o poder de compra real, que depende dos impostos, da renda e do custo de vida do país de destino.

Este projeto implementa um **pipeline ETL** completo que recolhe ofertas reais de emprego, normaliza moedas, periodicidades e localizações, cruza-as com índices de custo de vida e calcula a **Poupança Anual Estimada (€)** — um indicador do poder de compra efetivo de cada vaga. Os resultados são explorados num dashboard interativo e complementados por alertas em tempo real.

---

## 2. Arquitetura

Duas vias complementares que convergem para a mesma base de dados:

```
  VIA 1 — BATCH (KNIME)                    VIA 2 — STREAMING (Node-RED)
  ─────────────────────                    ────────────────────────────
  API Reed (JSON)                          API Reed (JSON)
  API Postcodes.io (JSON)                  API Postcodes.io (JSON)
  CSV Kaggle (ficheiro local)                      │
  Numbeo (HTML / XPath)                            │
          │                                        ▼
          ▼                              Node-RED (fluxo produtor)
  KNIME Analytics Platform                    │            │
  Concatenate · Joiner · Rule Engine          │            └──► Telegram
  Ciclo Timer 1h · DB Writer                  ▼                 @TechPowerISIBot
          │                                RabbitMQ
          │                              (amq.direct → fila_vagas)
          │                                   │
          │                                   ▼
          │                           Node-RED (fluxo consumidor)
          │                                   │
          ▼                                   ▼
  ┌───────────────────────────────────────────────────────────┐
  │  PostgreSQL · tech_power_db · porta 5432                  │
  │  ├── ofertas_emprego  (11 colunas · escrita pelo KNIME)   │
  │  └── vagas_nodered    ( 5 colunas · escrita pelo Node-RED)│
  └───────────────────────────────────────────────────────────┘
          │
          ▼
      Grafana — dashboard "Tech Power Purchasing"
```

| | Via 1 — Batch (KNIME) | Via 2 — Streaming (Node-RED) |
|---|---|---|
| **Objetivo** | Análise macroeconómica e carga histórica | Monitorização de novas vagas e alertas |
| **Formatos** | JSON, CSV e HTML/XPath | JSON |
| **Enriquecimento** | Índices Numbeo e taxa de imposto | Não aplicável (tratamento leve) |
| **Tabela de destino** | `ofertas_emprego` (11 colunas) | `vagas_nodered` (5 colunas) |
| **Modo de escrita** | Substituição da tabela em cada execução | *Upsert* com deduplicação |
| **Saída** | Dashboard no Grafana | Alertas no Telegram |

> **Porquê duas tabelas?** O nó `DB Writer` do KNIME opera em modo de substituição, repondo a tabela inteira em cada ciclo. Se as duas vias partilhassem a mesma tabela, a execução do KNIME apagaria os registos capturados em tempo real pelo Node-RED.

---

## 3. Fases do ETL

### 3.1. Extração

Quatro origens em **três formatos distintos**:

| Origem | Formato | Mecanismo | Via |
|---|---|---|---|
| API REST da Reed | JSON | Pedidos HTTP GET | Batch e streaming |
| API Postcodes.io | JSON | Geocodificação de códigos postais | Batch e streaming |
| Dataset Kaggle (salários) | CSV | Leitura de ficheiro local (`CSV Reader`) | Batch |
| Numbeo *Cost of Living Index* | HTML | *Web scraping* com XPath | Batch |

### 3.2. Transformação

* **Limpeza e validação** — remoção de registos sem título, com salário nulo ou valores mal introduzidos.
* **Expressões regulares** — separação de localizações com códigos postais (`Row Splitter`) e validação do padrão britânico no Node-RED.
* **Geocodificação** — resolução dos códigos postais para país via Postcodes.io.
* **Anualização salarial** — inferência da periodicidade pela ordem de grandeza (`< 100` = hora × 1950; `100–1500` = dia × 260; `1500–10000` = mês × 12).
* **Conversão cambial** — normalização para euros (taxa GBP→EUR de 1,17).
* **Padronização** — `Concatenate` dos dois ramos e três `Rule Engine` (nível de experiência, cidade→país, tipo de mercado).
* **Cruzamento** — `Joiner` entre as vagas e os índices Numbeo, pelo país.
* **Cálculo final** — dedução do imposto (30%) e ponderação pelo custo de vida e renda → **Poupança Anual Estimada (€)**.

### 3.3. Carregamento

* **RabbitMQ** — fila `fila_vagas` no *exchange* `amq.direct`, que desacopla extração e persistência.
* **PostgreSQL** — duas tabelas com modelos de escrita distintos; a via contínua usa `ON CONFLICT (titulo_vaga, localizacao) DO UPDATE`.
* **Grafana** — dashboard com quatro painéis e duas variáveis dinâmicas (`$Pais`, `$Nivel_Experiencia`).
* **Telegram** — alertas quando o salário anual é ≥ 100 000 € ou o título contém tecnologias de nicho (*cobol*, *rust*, *blockchain*, *machine learning*, *quantum*, *fortran*, *elixir*, *power electronics*).

---

## 4. Estrutura do Repositório

Segue o princípio de **Infrastructure as Code**: o Git guarda a configuração e a estrutura; os dados reais ficam nos volumes do Docker, fora do repositório.

```
tech-purchasing-power/
├── docker/
│   ├── docker-compose.yml          Definição dos 4 contentores
│   ├── .env                        Credenciais (NÃO versionado)
│   └── postgres/init/
│       └── 01_init_tables.sql      Esquema das tabelas (corre no 1.º arranque)
├── grafana/
│   ├── provisioning/               Fonte de dados e carregamento automático
│   ├── dashboards/                 Dashboards exportados (.json)
│   └── README.md                   Como exportar o dashboard
├── node_red/
│   ├── flows.json                  Fluxos exportados
│   └── README.md                   Como exportar e restaurar os fluxos
├── knime_workspace/
│   └── IT_Jobs_Extraction/         Workflow de ETL do KNIME
├── data/
│   └── kaggle_DataScience_salaries/   Datasets de entrada (CSV)
├── docs/
│   └── 29382_doc.pdf               Relatório final
├── .env.example                    Modelo de configuração
└── .gitignore
```

### O que **não** entra no Git

| Não versionado | Porquê |
|---|---|
| Volumes do PostgreSQL, RabbitMQ, Grafana e Node-RED | Ficheiros binários transacionais que mudam constantemente; corrompem-se fora do contexto do motor e inflacionam o histórico |
| `docker/.env` | Contém passwords |
| `node_red/flows_cred.json` | Credenciais cifradas |
| `knime_workspace/.metadata/` | Cache do IDE do KNIME |

Para guardar os **dados** da BD (e não só a estrutura), usar um dump de texto, fora do Git ou num *release*:

```bash
docker exec -t tech_power_db pg_dump -U $DB_USER tech_purchasing_power > backup_dados.sql
```

---

## 5. Como Executar

### 5.1. Pré-requisitos

| Ferramenta | Onde corre |
|---|---|
| Docker Desktop | Anfitrião |
| KNIME Analytics Platform 5.x | Anfitrião (aplicação desktop) |
| Node-RED, RabbitMQ, PostgreSQL, Grafana | Contentores |

### 5.2. Arranque

```bash
git clone https://github.com/Alexms22/tech-purchasing-power.git
cd tech-purchasing-power

# 1. Configurar credenciais
cp .env.example docker/.env
#    editar docker/.env e preencher os valores

# 2. Levantar a infraestrutura
cd docker
docker compose up -d
docker compose ps
```

No primeiro arranque, o PostgreSQL executa o `01_init_tables.sql` e cria as duas tabelas; o Grafana cria a fonte de dados automaticamente.

| Serviço | URL |
|---|---|
| Node-RED | http://localhost:1880 |
| Grafana | http://localhost:3000 |
| RabbitMQ (gestão) | http://localhost:15672 |
| PostgreSQL | `localhost:5432` |

### 5.3. Via Batch — KNIME

1. Abrir o KNIME e importar `knime_workspace/IT_Jobs_Extraction`.
2. No nó **CSV Reader**, apontar para o CSV em `data/kaggle_DataScience_salaries/`.
3. No nó **PostgreSQL Connector** (*Ligação à BD*): `localhost:5432`, base de dados `tech_purchasing_power`, credenciais do `.env`.
4. *Execute all*. O ciclo `Counting Loop Start` / `Wait (Timer 1h)` / `Variable Loop End` repete a execução de hora a hora.

### 5.4. Via Streaming — Node-RED

Ver [`node_red/README.md`](node_red/README.md) para importar os fluxos e preencher as credenciais.

### 5.5. Dashboard — Grafana

Ver [`grafana/README.md`](grafana/README.md) para exportar e carregar o dashboard.

---

## 6. Notas Importantes

> ⚠️ **Credenciais.** O token do bot do Telegram e as passwords não estão no repositório. Criar o bot através do [@BotFather](https://t.me/BotFather) e preencher o `docker/.env`.

> ⚠️ **Limitação de tráfego das APIs.** Execuções manuais repetidas originam respostas `429 Too Many Requests` nas APIs da Reed e da Postcodes.io. O filtro do nó `Normal Data` e a validação do `Rebuild Params` descartam essas respostas, pelo que o pipeline não falha — mas os registos dessa execução não são carregados.

> ℹ️ **Maiúsculas no PostgreSQL.** A tabela `ofertas_emprego` tem nomes de colunas com maiúsculas e acentos, pelo que **exigem aspas duplas**: `SELECT "Pais_Numbeo" FROM ofertas_emprego`. A `vagas_nodered` usa minúsculas e dispensa aspas.

> ℹ️ **Limitações conhecidas.** A taxa de câmbio (1,17) e a taxa de imposto (30%) são fixas; os índices do Numbeo são um retrato do momento da execução; e a anualização infere a periodicidade pela ordem de grandeza, o que pode classificar mal casos-limite.

---

## 7. Tecnologias

![KNIME](https://img.shields.io/badge/KNIME-FDD400?style=flat&logo=knime&logoColor=black)
![Node-RED](https://img.shields.io/badge/Node--RED-8F0000?style=flat&logo=node-red&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat&logo=rabbitmq&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat&logo=grafana&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat&logo=telegram&logoColor=white)
