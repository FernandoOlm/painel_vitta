# Conexão do Bot via QR Code — Status e especificação (Antigravity)

Status atual: **comunicação NO AR**. Testado em 01/09/2026:

```
curl -m 8 http://35.255.126.132:4000/health
{"status":"disconnected","qr":null,"queueSize":0}

curl -X POST http://35.255.126.132:4000/api/whatsapp/restart
{"ok":true,"message":"Reiniciando sessão"}

curl -m 8 http://35.255.126.132:4000/health
{"status":"qr","qr":"https://wa.me/settings/linked_devices#2@qUcAK...","queueSize":0}
```

Ou seja: VPS respondendo, porta 4000 aberta, `/health` e `/restart` funcionando e QR sendo
gerado. O site já lê esse QR em `/conectar-bot`.

- IP atual da VPS: **`35.255.126.132`** (o antigo `35.253.246.93` está morto/timeout).
- O site usa esse endereço via secret `BOT_CAMPANHA_URL`; o fallback no código
  (`supabase/functions/bot-campanha/index.ts`) também já aponta para o IP novo.
- Sempre que o IP mudar, basta avisar — atualizamos o secret, sem alteração de código.

---

## 1. Respostas às perguntas em aberto

| Pergunta | Resposta definitiva |
|---|---|
| Formato do QR | **String bruta** do Baileys (`2@Ab3...`). Base64 (`data:image/png;base64,...`) também é aceito. Hoje vocês devolvem `https://wa.me/settings/linked_devices#2@...` — o site já corta o prefixo e renderiza só o `2@...`, mas o ideal é mandar a string bruta. |
| Tempo real | **Polling**. O site chama `/health` a cada 4 s. Não precisa WebSocket/SSE. |
| Endpoints | Exatamente os da seção 3 (já implementados dos dois lados). |
| Pós-conexão | `status: "connected"` + `whatsapp` (número) e, se possível, `name`. `queueSize` alimenta o painel de campanhas. |
| Precisa HTTPS/NGINX/domínio? | **Não.** HTTP puro na porta 4000 basta (ver seção 2). |
| Precisa CORS? | Não — a chamada é servidor→servidor. Liberar `*` não atrapalha. |
| Autenticação? | Hoje nenhuma. Se quiserem token, avisem o nome do header e cadastramos como secret. |

---

## 2. Como o site fala com a VPS

O navegador **não** chama a VPS diretamente (site HTTPS × VPS HTTP:4000 → mixed content):

```
Navegador (HTTPS)
  → Função de borda `bot-campanha` (HTTPS)
    → VPS  http://35.255.126.132:4000
```

Consequências:
- Serviço precisa escutar em `0.0.0.0:4000`, **não** em `127.0.0.1`.
- Porta 4000 liberada no firewall do GCP para `0.0.0.0/0` (TCP).
- **Timeout de 8 s** por requisição; `/health` deve responder em <1 s e nunca bloquear
  esperando o QR ser gerado.

---

## 3. Contrato dos endpoints

### 3.1 `GET /health` — status + QR (endpoint do polling)

Sempre `200` com JSON:

```jsonc
{
  "status": "qr",              // qr | connecting | connected | disconnected
  "qr": "2@Ab3xY...",          // string bruta; null quando não houver QR
  "whatsapp": "5511999999999", // opcional, quando connected
  "name": "Vitta Engenharia",  // opcional
  "queueSize": 0               // opcional
}
```

Mapeamento aceito (o site normaliza para minúsculas):

| `status` | Significado | O que o site mostra |
|---|---|---|
| `qr`, `QR_READY`, `qrcode`, `waiting_qr` | QR válido — `qr` preenchido | QR na tela: "Pronto para escanear" |
| `connecting` | Gerando QR | Spinner: "Aguardando geração do QR Code..." |
| `connected`, `open`, `ready` | Sessão ativa | "Conectado" + número |
| `disconnected`, `close`, `logged_out` | Sem sessão | Botão "Gerar novo QR Code" |

Regras:
- Guardar sempre o último QR em memória (o Baileys troca a cada ~20 s) e devolvê-lo aqui.
- QR expirado e sem substituto → `status: "connecting"`, `qr: null`.
- Ao conectar: `qr: null` e `status: "connected"`.
- Nunca devolver HTML nem 500 — o site interpreta como bot offline.

### 3.2 `POST /api/whatsapp/restart` — novo QR / reiniciar sessão

Encerra a sessão, reinicia o socket e responde **imediatamente** (sem esperar o QR):

```json
{ "ok": true, "message": "Reiniciando sessão" }
```

✅ Já funcionando conforme o teste acima.

### 3.3 `POST /api/campanhas/disparar` — envio de campanha

Corpo enviado pelo site:

```jsonc
{
  "message": "Texto da mensagem",                    // obrigatório
  "targets": ["5511999999999", "5511888888888"],     // obrigatório, só dígitos com DDI 55
  "mediaUrl": "https://.../arquivo.jpg",             // opcional, link HTTPS assinado (~1 ano)
  "scheduledAt": "2026-09-02T13:00:00.000Z"          // opcional, ISO 8601 UTC
}
```

Resposta esperada:

```json
{ "ok": true, "queued": 2, "message": "Campanha na fila" }
```

Erro: `{ "ok": false, "error": "motivo legível" }` — o site exibe a string ao usuário.

Observações:
- `scheduledAt` preenchido → agendar; ausente → disparar imediatamente.
- `mediaUrl`: baixar e enviar como mídia; se o download falhar, enviar só o texto e reportar em `error`.
- Intervalo aleatório entre envios (8–25 s recomendado) para evitar bloqueio.

---

## 4. Checklist final para o Antigravity

- [x] Serviço rodando em `0.0.0.0:4000` com restart automático (pm2/systemd).
- [x] Porta 4000 liberada no firewall do GCP.
- [x] `GET /health` responde <1 s no formato da seção 3.1.
- [x] `POST /api/whatsapp/restart` força novo QR.
- [ ] `POST /api/campanhas/disparar` validado com payload real da seção 3.3 (confirmar).
- [ ] Enviar o QR como **string bruta** `2@...` (hoje vem com prefixo de link — o site contorna).
- [ ] Credenciais do Baileys persistidas em disco (`auth_info`) para não pedir QR a cada restart.
- [ ] Avisar imediatamente se o IP da VPS mudar (IP fixo/estático no GCP evita o problema).
