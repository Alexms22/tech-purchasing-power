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

**https://scanned.page/p/Yjo87I**

> ⚠️ **Validade da ligação.** O vídeo está alojado num serviço de partilha
> temporária, pelo que esta ligação **expira ao fim de dez dias** a contar
> da data de entrega. Caso já não esteja acessível, o ficheiro de vídeo
> pode ser solicitado ao autor através do endereço de correio eletrónico
> indicado no relatório (`doc/29382_doc.pdf`).

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
* **Expressões regulares** — o `switch` do Node-RED encaminha por `\d` as localizações que contêm algarismos (códigos postais); o `Postal Code Filter` limpa os caracteres não alfanuméricos antes da consulta à API.
* **Geocodificação** — resolução dos códigos postais para país via Postcodes.io.
* **Anualização salarial** — inferência da periodicidade pela ordem de grandeza (`< 100` = hora × 1950; `100–1500` = dia × 260; `1500–10000` = mês × 12).
* **Conversão cambial** — normalização para euros (taxa GBP→EUR de 1,17).
* **Padronização** — `Concatenate` dos dois ramos e três `Rule Engine` (nível de experiência, cidade→país, tipo de mercado).
* **Cruzamento** — `Joiner` entre as vagas e os índices Numbeo, pelo país.
* **Cálculo final** — dedução do imposto (30%) e ponderação pelo custo de vida e renda → **Poupança Anual Estimada (€)**.

### 3.3. Carregamento

* **RabbitMQ** — fila `fila_vagas` no *exchange* `amq.direct`, que desacopla extração e persistência.
* **PostgreSQL** — duas tabelas com modelos de escrita distintos; a via contínua usa `ON CONFLICT (titulo_vaga, localizacao) DO UPDATE`.
* **Grafana** — dashboard *Tech Power Purchasing* com quatro painéis.
* **Telegram** — alertas quando o salário anual é ≥ 100 000 € ou o título contém tecnologias de nicho (*cobol*, *rust*, *blockchain*, *machine learning*, *quantum*, *fortran*, *elixir*, *power electronics*).

---

## 4. Estrutura do Repositório

Segue o princípio de **Infrastructure as Code**: o Git guarda a configuração e a estrutura; os dados reais ficam nos volumes do Docker, fora do repositório.

```
tp01-29382/
├── README.md                       Este ficheiro
├── doc/
│   └── 29382_doc.pdf               Relatório final
├── dataintegration/                Transformações e jobs do ETL
│   ├── knime/
│   │   └── IT_Jobs_Extraction/     Workflow completo do KNIME
│   ├── nodered/
│   │   └── flows.json              Os dois fluxos (produtor e consumidor)
│   ├── grafana/
│   │   ├── dashboards/             Dashboard exportado (.json)
│   │   └── provisioning/           Fonte de dados e carregamento automático
│   └── docker/
│       ├── docker-compose.yml      Definição dos 4 contentores
│       └── postgres/init/
│           └── 01_init_tables.sql  Esquema das tabelas
├── data/
│   ├── input/                      Dataset de entrada (CSV do Kaggle)
│   └── output/                     Amostras dos dados carregados
├── src/
│   ├── nodered/                    Código dos 7 nós function
│   └── sql/                        Esquema e consultas do dashboard
└── .env.example                    Modelo de configuração
```

O projeto está também disponível em
**https://github.com/Alexms22/tech-purchasing-power**, onde a estrutura
segue a organização habitual de um repositório (pastas `docker/`,
`grafana/`, `node_red/`, `knime_workspace/`, `src/` e `data/` na raiz).

### Credenciais e dados não incluídos

Seguindo o princípio de **Infrastructure as Code**, a entrega contém a
configuração e a estrutura, não os dados nem os segredos:

| Não incluído | Porquê |
|---|---|
| Volumes do PostgreSQL, RabbitMQ, Grafana e Node-RED | Ficheiros binários transacionais; corrompem-se fora do contexto do motor |
| Ficheiro `.env` com as passwords | Credenciais (ver `.env.example` para o modelo) |
| `flows_cred.json` do Node-RED | Credenciais cifradas |
| Ficheiro de vídeo (56 MB) | Disponibilizado através da ligação indicada acima |

Em `data/output/` seguem amostras dos dados efetivamente carregados: 500
registos da tabela `ofertas_emprego` (que tem 200 021 no total) e a
totalidade da `vagas_nodered` (309 registos).

## 5. Como Executar

### 5.1. Pré-requisitos

| Ferramenta | Onde corre |
|---|---|
| Docker Desktop | Anfitrião |
| KNIME Analytics Platform 5.x | Anfitrião (aplicação desktop) |
| Node-RED, RabbitMQ, PostgreSQL, Grafana | Contentores |

### 5.2. Arranque

A partir da raiz da pasta entregue (`tp01-29382/`):

```bash
# 1. Configurar credenciais
cp .env.example dataintegration/docker/.env
#    editar esse ficheiro e preencher os valores

# 2. Levantar a infraestrutura
cd dataintegration/docker
docker compose up -d
docker compose ps
```

No primeiro arranque, o PostgreSQL executa o `01_init_tables.sql` e cria as duas tabelas; o Grafana cria a fonte de dados e carrega o dashboard automaticamente.

| Serviço | URL |
|---|---|
| Node-RED | http://localhost:1880 |
| Grafana | http://localhost:3000 |
| RabbitMQ (gestão) | http://localhost:15672 |
| PostgreSQL | `localhost:5432` |

### 5.3. Via Batch — KNIME

1. Abrir o KNIME e importar o workflow de `dataintegration/knime/IT_Jobs_Extraction`.
2. No nó **CSV Reader**, apontar para o ficheiro em `data/input/`.
3. No nó **PostgreSQL Connector** (*Ligação à BD*): `localhost:5432`, base de dados `tech_purchasing_power`, credenciais do `.env`.
4. *Execute all*. O ciclo `Counting Loop Start` / `Wait (Timer 1h)` / `Variable Loop End` repete a execução de hora a hora.

### 5.4. Via Streaming — Node-RED

1. Abrir http://localhost:1880 → menu ☰ → **Import** → colar o conteúdo de `dataintegration/nodered/flows.json`.
2. **Deploy**.

Já vem configurado, por leitura do `.env`: o nó `TechPowerPostgres` (variáveis `DB_USER` e `DB_PASSWORD`) e o envio para o Telegram (`TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`).

Por preencher à mão, porque a exportação do Node-RED nunca inclui o ficheiro de credenciais:

| Nó | O que inserir |
|---|---|
| `Broker` (RabbitMQ) | Utilizador e password do RabbitMQ |
| `http request` do primeiro ramo | Chave da API da Reed (autenticação *basic*) |

### 5.5. Dashboard — Grafana

O dashboard é carregado automaticamente pelo *provisioning* em `dataintegration/grafana/`. Se não aparecer, importar à mão em **Dashboards → New → Import → Upload JSON file**, a partir de `dataintegration/grafana/dashboards/`.

---

## 6. Notas Importantes

> ⚠️ **Credenciais.** O `flows.json` versionado **não contém o token do Telegram**: o nó `Good Role Alert` lê-o de `env.get("TELEGRAM_BOT_TOKEN")` e o destinatário de `env.get("TELEGRAM_CHAT_ID")`. Para os alertas funcionarem é preciso definir as duas variáveis em `dataintegration/docker/.env` e correr `docker compose restart nodered`.

> ⚠️ **Limitação de tráfego das APIs.** Execuções manuais repetidas originam respostas `429 Too Many Requests` nas APIs da Reed e da Postcodes.io. O filtro do nó `Normal Data` e a validação do `Rebuild Params` descartam essas respostas, pelo que o pipeline não falha — mas os registos dessa execução não são carregados.

> ℹ️ **Maiúsculas no PostgreSQL.** A tabela `ofertas_emprego` tem nomes de colunas com maiúsculas e acentos, pelo que **exigem aspas duplas**: `SELECT "Pais_Numbeo" FROM ofertas_emprego`. A `vagas_nodered` usa minúsculas e dispensa aspas.

> ℹ️ **Limitações conhecidas.** A taxa de câmbio (1,17) e a taxa de imposto (30%) são fixas; os índices do Numbeo são um retrato do momento da execução; a anualização infere a periodicidade pela ordem de grandeza, o que pode classificar mal casos-limite; e os painéis do dashboard filtram em SQL, sem variáveis dinâmicas.

---

## 7. Tecnologias

![KNIME](https://img.shields.io/badge/KNIME-FDD400?style=flat&logo=knime&logoColor=black)
![Node-RED](https://img.shields.io/badge/Node--RED-8F0000?style=flat&logo=node-red&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat&logo=rabbitmq&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat&logo=grafana&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat&logo=telegram&logoColor=white)
