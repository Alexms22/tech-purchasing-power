# Node-RED — como executar

Os dois fluxos do projeto estão em [`flows.json`](flows.json):

| Separador | O que faz |
|---|---|
| *Recebe dados da API e envia SMS para RabbitMQ* | Produtor: extração, transformação, publicação na fila e alertas |
| *Insere dados na BD* | Consumidor: lê a fila, reconstrói os parâmetros e faz o *upsert* |

## Importar

1. Levantar a infraestrutura: `docker compose up -d` (a partir de `docker/`)
2. Abrir http://localhost:1880
3. Menu ☰ → **Import** → colar o conteúdo de `flows.json`
4. **Deploy**

## Credenciais

Estas ligações leem o `.env` e **não precisam de ser preenchidas**:

| Nó | Variáveis usadas |
|---|---|
| `TechPowerPostgres` | `DB_USER`, `DB_PASSWORD` |
| `Good Role Alert` → Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |

Estas têm de ser preenchidas à mão, porque a exportação do Node-RED nunca
inclui o ficheiro de credenciais:

| Nó | O que inserir |
|---|---|
| `Broker` (RabbitMQ) | Utilizador e password do RabbitMQ (`RABBITMQ_USER` / `RABBITMQ_PASSWORD`) |
| `http request` do primeiro ramo | Chave da API da Reed (autenticação *basic*: a chave como utilizador, password vazia) |

## Confirmar que está a funcionar

- O nó `amq.direct: fila_vagas` mostra **Connected**
- O nó `TechPowerPostgres` mostra **Queue: 0**
- Para disparar sem esperar pela hora, clicar no botão à esquerda de
  `Alert 1 every hour` e observar o painel de *debug*
