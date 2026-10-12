# Tech Purchasing Power

**Avaliação do Poder de Compra em TI face ao Custo de Vida**

**Unidade Curricular:** Integração de Sistemas de Informação (ISI)  
**Curso:** Licenciatura em Engenharia de Sistemas Informáticos - UPCA (2026/2027)  
**Autor:** Alexandre Silva

---

## Descrição do Projeto
A tomada de decisão na aceitação de uma oferta de emprego em TI (Tecnologias de Informação) ou na deslocalização de país não deve basear-se apenas no valor bruto oferecido, mas sim no poder de compra real dessa localização. 

Este projeto implementa um pipeline de dados **ETL (Extract, Transform, Load)** completo. O sistema extrai ofertas reais de emprego de APIs públicas, cruza-as com índices de custo de vida locais e normaliza as moedas internacionais. O resultado final permite visualizar e analisar, através de dashboards, o verdadeiro "Salário Real" e a qualidade de vida proporcionada por vagas de TI em diferentes cidades do mundo.

---

## Arquitetura e Fases ETL

### 1. Extração (Extract)
Recolha de dados de três fontes heterogéneas em formatos distintos:
* **JSON:** APIs públicas de emprego (ex: Arbeitnow / Remotive) para obter listagens de vagas de TI, salários e localizações.
* **XML:** Feed diário oficial do Banco Central Europeu (BCE) para garantir as taxas de câmbio cambiais sempre atualizadas.
* **CSV:** Dataset estático com o Índice de Custo de Vida por cidade.

### 2. Transformação (Transform)
Processamento centralizado no **KNIME Analytics Platform**:
* Leitura e conversão (*Parsing*) dos ficheiros JSON e XML.
* Limpeza de dados (remoção de vagas sem ordenado base).
* Utilização de **Expressões Regulares (Regex)** para extrair e catalogar competências tecnológicas (ex: C#, Docker, Python) a partir da descrição das vagas.
* Normalização cambial para Euros.
* Cruzamento (*Join/Merge*) das vagas de emprego com os dados demográficos de custo de vida da respetiva cidade.

### 3. Carregamento e Orquestração (Load)
* **Node-RED:** Responsável pela orquestração do fluxo, agendamento de execução e envio automático de alertas por e-mail sobre o estado do processamento.
* **PostgreSQL (Docker):** Armazenamento dos dados limpos e finalizados numa base de dados relacional.
* **Grafana (Docker):** Ligação à base de dados para visualização de métricas e análise comparativa.

---

## Estrutura do Repositório

* `/knime_workspace/` - Contém os *Workflows* de extração e transformação desenhados no KNIME.
* `/docker/` - Ficheiro `docker-compose.yml` para levantar a infraestrutura de Base de Dados e Visualização.
* `/node_red/` - Fluxos exportados do orquestrador Node-RED.
* `/docs/` - Documentação de suporte, relatório técnico e apresentação do projeto.

---
