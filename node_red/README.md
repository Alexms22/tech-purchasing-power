# Node-RED — fluxos versionados

## O que tem de estar aqui

| Ficheiro | Versionar? | Porquê |
|---|---|---|
| `flows.json` | ✅ Sim | É o código dos fluxos — o que interessa guardar |
| `flows_cred.json` | ❌ **Nunca** | Credenciais cifradas (BD, RabbitMQ, token do Telegram) |
| `settings.js` | ✅ Opcional | Só se tiver configuração personalizada |
| `node_modules/` | ❌ Não | Dependências; reinstaladas a partir do `package.json` |

O `.gitignore` do projeto já exclui os ficheiros de credenciais.

## Exportar os fluxos para aqui

### Opção A — pela interface (rápido)

1. Abrir http://localhost:1880
2. Menu ☰ → **Export** → separador **All flows**
3. **Download** e guardar o ficheiro nesta pasta como `flows.json`

> ⚠️ A exportação **não inclui as credenciais**, de propósito. Quem
> importar os fluxos tem de voltar a preencher as passwords da BD, do
> RabbitMQ e o token do Telegram.

### Opção B — copiar do volume (equivalente)

```bash
docker cp tech_power_nodered:/data/flows.json ./flows.json
```

> ⚠️ **Não** copiar o `flows_cred.json` que está ao lado no volume.

## Restaurar os fluxos num computador novo

1. `docker compose up -d`
2. Abrir http://localhost:1880 → menu ☰ → **Import** → colar o conteúdo de `flows.json`
3. Preencher as credenciais em cada nó:
   - **amq.direct: fila_vagas** → `tech_power_rabbitmq:5672`
   - **TechPowerPostgres** → `tech_power_db:5432`, base de dados `tech_purchasing_power`
   - **http request Telegram** → inserir o token do bot no URL
4. **Deploy**

## Alternativa: Node-RED Projects (integração nativa com Git)

O Node-RED consegue ligar-se ao repositório e fazer commit dos fluxos a
partir da própria interface. Para ativar, editar o `settings.js` dentro do
volume:

```bash
docker exec -it tech_power_nodered sh -c "vi /data/settings.js"
```

e mudar, na secção `editorTheme`:

```javascript
projects: {
    enabled: true
}
```

Depois, `docker compose restart nodered`. Passa a existir um separador de
Git no editor.

> ⚠️ Com *Projects* ativo, o Node-RED passa a guardar os fluxos numa
> subpasta `projects/` dentro do volume e **deixa de usar o `/data/flows.json`**.
> Convém fazer a exportação acima **antes** de ativar, para não perder o
> trabalho atual.
