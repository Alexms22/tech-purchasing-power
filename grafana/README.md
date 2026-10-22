# Grafana — configuração versionada

## O que está aqui

| Caminho | Função |
|---|---|
| `provisioning/datasources/postgres.yml` | Cria a ligação ao PostgreSQL automaticamente no arranque |
| `provisioning/dashboards/dashboards.yml` | Faz o Grafana carregar os `.json` de `dashboards/` |
| `dashboards/` | Os dashboards exportados (ficheiros JSON) |

Nada disto contém passwords: as credenciais vêm do `.env` através do `docker-compose.yml`.

## Exportar o dashboard para aqui

O ficheiro JSON do dashboard **tem de ser exportado manualmente** a partir do Grafana:

1. Abrir o dashboard **Tech Power Purchasing** em http://localhost:3000
2. Ícone de **partilha** (topo) → separador **Export**
3. **Desligar** a opção *Export for sharing externally*
   *(com esta opção ligada, o Grafana substitui a fonte de dados por uma
   variável `DS_...` que obriga a escolher a ligação a cada importação)*
4. **Save to file**
5. Guardar o ficheiro nesta pasta como `dashboards/tech_power_purchasing.json`

## Depois de exportar

```bash
docker compose -f ../docker/docker-compose.yml restart grafana
```

O dashboard aparece na pasta *Tech Purchasing Power* do Grafana.

> **Se os painéis aparecerem vazios** após a importação, é porque o JSON
> exportado aponta para o `uid` da fonte de dados antiga. Abrir o JSON e
> substituir todos os `"uid": "..."` dentro dos blocos `datasource` por
> `"uid": "cg1puqxn0v6rke"` (o uid definido no provisioning).

---

## Nota sobre o formato do ficheiro

O dashboard em `dashboards/tech_power_purchasing.json` foi exportado pelo
Grafana 13 no **schema v2** (`apiVersion: dashboard.grafana.app/v2`).

O carregamento automático por *provisioning* foi desenhado para o schema
clássico. Se, após `docker compose restart grafana`, o dashboard não
aparecer na pasta *Tech Purchasing Power*, importar manualmente:

**Dashboards → New → Import → Upload JSON file**

A fonte de dados criada pelo provisioning usa o `uid` `cg1puqxn0v6rke`,
que é exatamente o que o JSON referencia — por isso os painéis ligam-se
sozinhos, sem ter de escolher a ligação.
