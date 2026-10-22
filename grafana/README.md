# Grafana — como executar

| Caminho | Função |
|---|---|
| `provisioning/datasources/postgres.yml` | Cria a ligação ao PostgreSQL no arranque |
| `provisioning/dashboards/dashboards.yml` | Faz o Grafana carregar os `.json` de `dashboards/` |
| `dashboards/tech_power_purchasing.json` | O dashboard do projeto |

Nada aqui contém passwords: as credenciais vêm do `.env` através do
`docker-compose.yml`.

## Executar

1. `docker compose up -d` (a partir de `docker/`)
2. Abrir http://localhost:3000 (utilizador `admin`, password definida em
   `GRAFANA_PASSWORD`)
3. O dashboard aparece na pasta **Tech Purchasing Power**

A fonte de dados e o dashboard são criados automaticamente — não é preciso
configurar nada.

## Se o dashboard não aparecer

O ficheiro foi exportado pelo Grafana 13 no *schema* v2
(`apiVersion: dashboard.grafana.app/v2`), que nem todas as versões carregam
por *provisioning*. Nesse caso, importar à mão:

**Dashboards → New → Import → Upload JSON file** →
`dashboards/tech_power_purchasing.json`

A fonte de dados criada pelo *provisioning* usa o `uid` `cg1puqxn0v6rke`,
que é o que o JSON referencia, por isso os painéis ligam-se sozinhos.
