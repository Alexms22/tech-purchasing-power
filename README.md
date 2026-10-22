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
| **Repositório** | https://github.com/Alexms22/tech-purchasing-power |

### 🎥 Vídeo de demonstração

**https://… (a preencher)**

---

## 1. Descrição do Projeto

A decisão de aceitar uma oferta de emprego em Tecnologias de Informação (TI), ou de mudar de país, não deve basear-se apenas no valor bruto anunciado. Comparar ofertas a nível mundial é difícil porque os salários surgem em **moedas diferentes** (libras, euros, dólares), em **periodicidades diferentes** (hora, dia, mês, ano) e com **localizações inconsistentes** (cidades, regiões, códigos postais). Acresce que o salário bruto não reflete o poder de compra real, que depende dos impostos, da renda e do custo de vida do país de destino.

Este projeto implementa um **pipeline ETL** completo que recolhe ofertas reais de emprego, normaliza moedas, periodicidades e localizações, cruza-as com índices de custo de vida e calcula a **Poupança Anual Estimada (€)** — um indicador do poder de compra efetivo de cada vaga. Os resultados são explorados num dashboard interativo e complementados por alertas em tempo real.

---

## 2. Arquitetura

A solução adota uma **arquitetura híbrida com duas vias complementares** que convergem para a mesma base de dados:

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
  ┌──────────────────────────────────────────────────────────┐
  │  PostgreSQL · tech_power_db · porta 5432                 │
  │  ├── ofertas_emprego  (11 colunas · escrita pelo KNIME)  │
  │  └── vagas_nodered    ( 5 colunas · escrita pelo Node-RED)│
  └──────────────────────────────────────────────────────────┘
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

### 3.1. Extração (Extract)

Recolha a partir de **quatro origens** em **três formatos distintos**:

| Origem | Formato | Mecanismo | Via |
|---|---|---|---|
| API REST da Reed | JSON | Pedidos HTTP GET (`GET Request` / `http request`) | Batch e streaming |
| API Postcodes.io | JSON | Geocodificação de códigos postais | Batch e streaming |
| Dataset Kaggle `LATEST_DATA_SCIENCE_SALARIES` | CSV | Leitura de ficheiro local (`CSV Reader`) | Batch |
| Numbeo *Cost of Living Index* | HTML | *Web scraping* com expressões XPath | Batch |

### 3.2. Transformação (Transform)

* **Limpeza e validação** — remoção de registos sem título, com salário nulo ou com valores mal introduzidos.
* **Expressões regulares (Regex)** — separação de localizações que contêm códigos postais (`Row Splitter`) e validação do padrão do código postal britânico no Node-RED.
* **Geocodificação** — resolução dos códigos postais para país através da API Postcodes.io.
* **Anualização salarial** — inferência da periodicidade a partir da ordem de grandeza (`< 100` = hora × 1950; `100–1500` = dia × 260; `1500–10000` = mês × 12).
* **Conversão cambial** — normalização para euros (taxa GBP→EUR de 1,17).
* **Padronização** — `Concatenate` dos dois ramos de vagas e três `Rule Engine` para uniformizar nível de experiência (*Entry*, *Mid*, *Senior*), mapear cidades para países e classificar o tipo de mercado.
* **Cruzamento (Join)** — `Joiner` entre as vagas e os índices Numbeo, usando o país como chave.
* **Cálculo final** — dedução da taxa de imposto (30%) e ponderação pelo custo de vida e renda, produzindo a **Poupança Anual Estimada (€)**.

### 3.3. Carregamento (Load)

* **RabbitMQ** — fila `fila_vagas` no *exchange* `amq.direct`, que desacopla a extração da persistência na via contínua.
* **PostgreSQL** — duas tabelas com modelos de escrita distintos (ver arquitetura). A via contínua usa *upsert* (`ON CONFLICT (titulo_vaga, localizacao) DO UPDATE`) para evitar duplicados.
* **Grafana** — dashboard *Tech Power Purchasing*, com quatro painéis e duas variáveis dinâmicas (`$Pais` e `$Nivel_Experiencia`).
* **Telegram** — alertas automáticos para o bot `@TechPowerISIBot` quando o salário anual é ≥ 100 000 € ou o título contém tecnologias de nicho (*cobol*, *rust*, *blockchain*, *machine learning*, *quantum*, *fortran*, *elixir*, *power electronics*).

---

## 4. Estrutura dos Ficheiros Entregues

```
tp01-29382/
├── README.md                          Este ficheiro
├── doc/
│   └── 29382_doc.pdf                  Relatório final do trabalho
├── dataintegration/
│   ├── knime/                         Workflow do KNIME (exportado em .knwf)
│   ├── nodered/                       Fluxos do Node-RED (flows.json)
│   └── docker/
│       └── docker-compose.yml         Definição dos quatro contentores
├── data/
│   ├── input/
│   │   └── LATEST_DATA_SCIENCE_SALARIES.csv    Dataset histórico (Kaggle)
│   └── output/
│       ├── ofertas_emprego.csv        Amostra dos dados carregados (via batch)
│       └── vagas_nodered.csv          Amostra dos dados carregados (via streaming)
└── src/
    ├── sql/
    │   ├── create_tables.sql          Criação das tabelas e restrições
    │   └── queries_grafana.sql        Consultas dos painéis do dashboard
    └── js/
        ├── normal_data.js             Regras de negócio (nó Normal Data)
        ├── rebuild_params.js          Reconstrução de parâmetros (consumidor)
        └── good_role_alert.js         Critérios de alerta (Telegram)
```

---

## 5. Como Executar

### 5.1. Pré-requisitos

| Ferramenta | Versão | Onde corre |
|---|---|---|
| Docker Desktop | — | Anfitrião |
| KNIME Analytics Platform | 5.x | Anfitrião (aplicação desktop) |
| Node-RED | `nodered/node-red:latest` | Contentor |
| RabbitMQ | `rabbitmq:3-management-alpine` | Contentor |
| PostgreSQL | `postgres:16-alpine` | Contentor |
| Grafana | `grafana/grafana:latest` | Contentor |

### 5.2. Levantar a infraestrutura

```bash
cd dataintegration/docker
docker compose up -d
docker compose ps        # confirmar que os 4 contentores estão em execução
```

Serviços disponíveis após o arranque:

| Serviço | URL | Credenciais |
|---|---|---|
| Node-RED | http://localhost:1880 | — |
| RabbitMQ (gestão) | http://localhost:15672 | definidas no `docker-compose.yml` |
| PostgreSQL | `localhost:5432` | base de dados `tech_purchasing_power` |
| Grafana | http://localhost:3000 | `admin` / `admin` (primeiro acesso) |

### 5.3. Criar as tabelas

```bash
docker exec -i tech_power_db psql -U postgres -d tech_purchasing_power < src/sql/create_tables.sql
```

### 5.4. Via 1 — Batch (KNIME)

1. Abrir o **KNIME Analytics Platform** no anfitrião.
2. Importar o workflow: *File → Import KNIME Workflow* → selecionar o ficheiro em `dataintegration/knime/`.
3. Configurar o nó **CSV Reader** com o caminho para `data/input/LATEST_DATA_SCIENCE_SALARIES.csv`.
4. Configurar o nó **PostgreSQL Connector** (anotado *Ligação à BD*): `localhost:5432`, base de dados `tech_purchasing_power`, e as credenciais definidas no `docker-compose.yml`.
5. Executar o workflow (*Execute all*). O ciclo `Counting Loop Start` / `Wait (Timer 1h)` / `Variable Loop End` repete a execução de hora a hora.

### 5.5. Via 2 — Streaming (Node-RED)

1. Aceder a http://localhost:1880.
2. Importar os fluxos: menu ☰ → *Import* → colar o conteúdo de `dataintegration/nodered/flows.json`.
3. Configurar as credenciais dos nós:
   * **amq.direct: fila_vagas** — anfitrião `tech_power_rabbitmq`, porta `5672`.
   * **TechPowerPostgres** — anfitrião `tech_power_db`, porta `5432`, base de dados `tech_purchasing_power`.
   * **http request Telegram** — inserir o *token* do bot no URL (ver secção 6).
4. Clicar em **Deploy**. O nó `Alert 1 every hour` dispara o fluxo automaticamente; para testar de imediato, usar o botão do nó de injeção.

### 5.6. Dashboard (Grafana)

1. Aceder a http://localhost:3000.
2. Adicionar a fonte de dados: *Connections → Data sources → PostgreSQL*
   * Host: `tech_power_db:5432`
   * Database: `tech_purchasing_power`
   * TLS/SSL Mode: `disable`
3. Criar o dashboard e os painéis com as consultas de `src/sql/queries_grafana.sql`, definindo as variáveis `Pais` e `Nivel_Experiencia` em *Dashboard settings → Variables* (tipo *Query*).

---

## 6. Notas Importantes

> ⚠️ **Credenciais.** O *token* do bot do Telegram e o `chat_id` **não** estão incluídos neste repositório. Para reproduzir os alertas é necessário criar um bot através do [@BotFather](https://t.me/BotFather) e inserir o *token* no nó `http request Telegram`.

> ⚠️ **Limitação de tráfego das APIs.** Execuções manuais repetidas em curtos intervalos originam respostas `429 Too Many Requests` nas APIs da Reed e da Postcodes.io. O filtro de qualidade do nó `Normal Data` e a validação do nó `Rebuild Params` descartam essas respostas inválidas, pelo que o pipeline não fica em erro — mas os registos dessa execução não são carregados.

> ℹ️ **Maiúsculas no PostgreSQL.** A tabela `ofertas_emprego` foi criada pelo KNIME com nomes de colunas que combinam maiúsculas e minúsculas (e incluem acentos), pelo que **exigem aspas duplas** nas consultas: `SELECT "Pais_Numbeo" FROM ofertas_emprego`. A tabela `vagas_nodered` usa nomes em minúsculas, que dispensam aspas.

> ℹ️ **Limitações conhecidas.** A taxa de câmbio (1,17) e a taxa de imposto (30%) são valores fixos; os índices do Numbeo são um retrato do momento da execução, sem série histórica; e a anualização infere a periodicidade pela ordem de grandeza do valor, o que pode classificar incorretamente casos-limite.

---

## 7. Tecnologias

![KNIME](https://img.shields.io/badge/KNIME-FDD400?style=flat&logo=knime&logoColor=black)
![Node-RED](https://img.shields.io/badge/Node--RED-8F0000?style=flat&logo=node-red&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat&logo=rabbitmq&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat&logo=grafana&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat&logo=telegram&logoColor=white)
