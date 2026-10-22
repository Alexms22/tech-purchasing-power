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
> `"uid": "tech-power-pg"` (o uid definido no provisioning).
