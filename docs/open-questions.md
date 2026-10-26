# Dúvidas e Ajustes — RESPONDIDO pela equipe Lovable

Status: **resolvido**. Abaixo, cada ponto levantado e a solução implementada.

## 1. Variáveis de Ambiente — resolvido
`VITE_BOT_CAMPANHA_URL` **não é mais necessária no navegador**. O endereço da VPS
agora é lido no **servidor** (backend do próprio site), pela variável:

```env
BOT_CAMPANHA_URL=http://35.253.246.93:4000
```

Se a variável não existir, o sistema usa `http://35.253.246.93:4000` como padrão.
Para trocar de IP/domínio, basta cadastrar o secret `BOT_CAMPANHA_URL`.

## 2. Mixed Content (HTTP vs HTTPS) — resolvido, sem precisar de NGINX/ngrok
O navegador não fala mais diretamente com a VPS. O fluxo passou a ser:

```
Navegador (HTTPS, same-origin)  ->  Servidor do site  ->  VPS (HTTP :4000)
```

Como a chamada do navegador é para o próprio domínio HTTPS, **não há mais bloqueio
de mixed content**. A ponte está em `src/lib/campanhas.functions.ts` (server
functions autenticadas) e é consumida por `src/services/apiCampanhas.ts`.

Rotas disponíveis (dados indo e voltando da VPS):
- `getBotHealthFn` → `GET /health` da VPS (status, `qr`, `queueSize`)
- `restartBotFn` → `POST /api/whatsapp/restart`
- `dispararCampanhaFn` → `POST /api/campanhas/disparar` (message, targets, mediaUrl, scheduledAt)

Segurança: todas exigem usuário autenticado no painel; a VPS nunca fica exposta
ao navegador e o IP não aparece no bundle do frontend.

Requisito na VPS: a porta 4000 precisa aceitar chamadas do servidor do site
(firewall liberado). CORS deixou de ser um problema, pois a chamada é server-to-server.

## 3. Telas e Dependências — resolvido
- `qrcode.react` já está instalado (`^4.2.0`) e em uso na tela de campanhas.
- Telas ativas: `/campanhas` (status + QR Code) e `/campanhas/nova` (disparo/agendamento).
- Ambas já constam no menu lateral: **Campanhas WhatsApp** e **Nova campanha**.
