# Acompanhamento de Campanhas em Tempo Real — Contrato Bot ↔ Painel

> **Status: painel 100% implantado.** Banco, Edge Function e dashboard de acompanhamento já estão no ar.
> Falta apenas o bot (Antigravity) implementar o delay humanizado e o POST de feedback descrito na seção 4.

---

## 1. Variáveis de Composição do Atraso (Delay Base) — responsabilidade do BOT

O tempo de espera antes de cada envio é a soma de quatro variáveis aleatórias independentes.

### $T_1$: Tamanho da campanha (quantidade de destinatários)
* Até 5: 3–6 s · Até 15: 5–11 s · Até 25: 7–15 s · Até 35: 8–20 s
* Até 50: 10–25 s · Até 75: 12–30 s · Até 100: 15–40 s · Mais de 100: 20–60 s

### $T_2$: Tamanho da mensagem (caracteres)
* Até 50: 2–4 s · 51–150: 4–8 s · 151–500: 6–12 s · Mais de 500: 8–20 s

### $T_3$: Presença de links
* Com link: 8–20 s · Sem link: 3–6 s

### $T_4$: Presença de imagem/mídia
* Com imagem: 8–20 s · Sem imagem: 3–6 s

## 2. Equação quadrática de descaracterização

```javascript
const S = t_campanha + t_tamanhoMsg + t_link + t_imagem;
const a = 0.015, b = 0.8;
const c = Math.floor(Math.random() * 5) + 1; // ruído 1–5 s
const tempoEsperaMs = Math.floor((a * S * S) + (b * S) + c) * 1000;
```

---

## 3. O que JÁ ESTÁ PRONTO no painel (não precisa fazer nada)

### Banco de dados
| Tabela | Campos relevantes |
| --- | --- |
| `campanhas` | `id` (uuid), `titulo`, `mensagem`, `media_url`, `destinatarios` (text[]), `total_destinatarios` (int), `scheduled_at`, `status` (`agendada` \| `em_andamento` \| `concluida` \| `erro`), `enviados` (int), `erros` (int), `finalizada_em` |
| `campanha_logs` | `id`, `campanha_id` (FK → campanhas, cascade), `target` (text), `status` (`sucesso` \| `erro`), `error_message`, `sent_at` |

* Realtime habilitado em `campanha_logs` **e** `campanhas`.
* Índice único `(campanha_id, target)` → reenvios do mesmo número fazem *upsert*, não duplicam.

### Edge Function `bot-campanha`
URL pública (fixa, HTTPS):
```
https://fmbdtzjwzzeqkmsafvow.supabase.co/functions/v1/bot-campanha
```
* `verify_jwt = false` → o bot pode chamar sem token de usuário.
* Ações suportadas: `health`, `restart`, `disparar`, **`webhook_disparo`** (nova).

### Frontend
* `/campanhas` — histórico com barra de progresso e link “Acompanhar”.
* `/campanhas/$id` — tela de acompanhamento: barra de progresso, contadores (enviados / erros / na fila) e log ao vivo via Supabase Realtime (com fallback de polling a cada 10 s).
* A campanha é gravada **antes** do disparo, então o `campaign_id` sempre existe quando o bot recebe a lista.

---

## 4. O QUE O BOT PRECISA FAZER (Antigravity)

### 4.1 Payload que o bot RECEBE em `POST /api/campanhas/disparar`

A Edge Function injeta três campos novos além dos que já existiam:

```json
{
  "message": "Texto da campanha",
  "targets": ["5511999999999", "5511888888888"],
  "mediaUrl": "https://.../arquivo.jpg",
  "scheduledAt": "2026-09-02T13:00:00.000Z",

  "campaign_id": "uuid-da-campanha",
  "webhook_url": "https://fmbdtzjwzzeqkmsafvow.supabase.co/functions/v1/bot-campanha",
  "webhook_secret": "<string opaca — apenas ecoar de volta>"
}
```

> **Importante:** guarde `campaign_id`, `webhook_url` e `webhook_secret` junto de cada item da fila.
> O `webhook_secret` **não precisa ser conhecido nem configurado no bot** — ele chega no payload e deve ser
> devolvido no header `x-bot-secret` de cada callback. Sem ele o painel responde `401 Invalid secret`.

### 4.2 Callback que o bot ENVIA após CADA número (sucesso ou erro)

```
POST {webhook_url}
Content-Type: application/json
x-bot-secret: {webhook_secret}
```

```json
{
  "action": "webhook_disparo",
  "payload": {
    "campaign_id": "uuid-da-campanha",
    "target": "5511999999999",
    "status": "sucesso",
    "error_message": null,
    "dispatched_at": "2026-09-01T17:50:00.000Z"
  }
}
```

Exemplo em Node:

```javascript
async function reportarEnvio(item, status, errorMessage = null) {
  try {
    await fetch(item.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': item.webhook_secret ?? '',
      },
      body: JSON.stringify({
        action: 'webhook_disparo',
        payload: {
          campaign_id: item.campaign_id,
          target: item.target,
          status,                       // 'sucesso' | 'erro'
          error_message: errorMessage,
          dispatched_at: new Date().toISOString(),
        },
      }),
    });
  } catch (e) {
    console.error('Falha ao reportar webhook (não interrompe a fila):', e.message);
  }
}
```

### 4.3 Resposta do painel

```json
{ "ok": true, "status": 200, "body": { "received": true, "processados": 7, "total": 20, "concluida": false } }
```

O painel calcula sozinho `enviados`, `erros` e marca a campanha como `concluida` quando
`sucesso + erro >= total_destinatarios`. **O bot não precisa avisar o fim da campanha.**

---

## 5. Respostas às perguntas em aberto

| Pergunta | Resposta |
| --- | --- |
| O bot precisa de credenciais do Supabase? | **Não.** Só faz POST HTTP na `webhook_url` com o header `x-bot-secret` recebido no payload. |
| E se o `campaign_id` vier `null`? | A campanha foi disparada por um fluxo antigo. Nesse caso o bot envia normalmente e **não** reporta webhook. |
| Reportar antes ou depois do envio? | **Depois** de cada tentativa, com o resultado real (`sucesso` ou `erro`). Um POST por número. |
| Pode fazer batch de callbacks? | Não neste contrato — o valor está no progresso ao vivo, um POST por número. |
| E se o callback falhar (rede)? | Ignore e siga a fila; opcionalmente 1 retry após 5 s. O painel tem fallback de polling. |
| Reenvio do mesmo número duplica log? | Não — o índice único `(campanha_id, target)` faz upsert. |
| Número deve vir formatado? | Envie só dígitos com DDI (`5511999999999`); o painel normaliza mesmo assim. |
| `status` aceita outros valores? | Apenas `sucesso` e `erro` (`success` também é aceito como sinônimo). Qualquer outro valor vira `erro`. |
| Timeout da ponte painel → VPS | 8 segundos. O endpoint `/api/campanhas/disparar` deve responder **imediatamente** (enfileirar e retornar `202/200`), nunca aguardar os envios. |
| Campanhas agendadas (`scheduledAt`) | O bot decide o horário de início; o painel só mostra `agendada` até chegar o primeiro webhook. |
| URL da VPS atual | `http://35.255.126.132:4000` (secret `BOT_CAMPANHA_URL`). Trocou de IP? Avise que atualizamos a secret. |

---

## 6. Checklist de integração para o Antigravity

- [ ] Ler `campaign_id`, `webhook_url` e `webhook_secret` do body do `POST /api/campanhas/disparar`.
- [ ] Persistir esses três campos em cada item da fila local.
- [ ] Aplicar o delay humanizado ($T_1..T_4$ + equação quadrática) antes de cada envio.
- [ ] Chamar `reportarEnvio(...)` após cada tentativa, com `sucesso` ou `erro` + `error_message`.
- [ ] Nunca deixar falha de webhook interromper a fila.
- [ ] Responder `/api/campanhas/disparar` em menos de 8 s (só enfileirar).
- [ ] Manter `/health` retornando `{ status, whatsapp, qr, queueSize }`.
