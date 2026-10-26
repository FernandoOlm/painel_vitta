# Instruções para o Lovable: Corrigir a Conexão com a VPS (Bot de Campanhas)

## O Problema Atual
O painel (Vitta Connect) está tentando buscar o status e o QR Code do bot acessando a VPS.
Atualmente, o painel se comunica com a VPS através da Edge Function do Supabase chamada `bot-campanha`. 

No entanto, existem dois bloqueios ocorrendo:
1. **O IP estava incorreto**: A função estava tentando acessar o IP antigo (`35.253.246.93`), mas o IP correto atual da VPS é `35.255.126.132`.
2. **Possível bloqueio de Firewall**: O Google Cloud (onde a VPS está hospedada) bloqueia conexões de entrada na porta `4000` por padrão.

## O que o Lovable precisa fazer (Tarefas para a IA do Lovable)

Por favor, Lovable, execute as seguintes alterações no repositório `vitta-connect`:

### 1. Atualizar a Edge Function (Supabase)
No arquivo `supabase/functions/bot-campanha/index.ts`, atualize a variável de fallback do IP para o IP correto da VPS, caso a variável de ambiente não esteja definida:

```typescript
// Mude de:
// const BOT_URL = Deno.env.get("BOT_CAMPANHA_URL") ?? "http://35.253.246.93:4000";

// Para:
const BOT_URL = Deno.env.get("BOT_CAMPANHA_URL") ?? "http://35.255.126.132:4000";
```

### 2. Configurar Variáveis no Supabase
Certifique-se de que, ao fazer o deploy da Edge Function `bot-campanha`, a configuração do projeto no Supabase possua a variável de ambiente:
`BOT_CAMPANHA_URL` configurada como `http://35.255.126.132:4000`

*(Nota: O Lovable pode instruir o usuário a fazer o deploy ou configurar essa secret no painel do Supabase).*

### 3. Alternativa de Arquitetura (Caso o Firewall não seja aberto)
Se o painel continuar retornando "Offline" após a atualização do IP, significa que a porta `4000` continua bloqueada no Firewall do Google Cloud. 

Se o usuário não conseguir abrir a porta `4000` no Google Cloud, **o Lovable precisará mudar a arquitetura de "Pull" para "Push"**:
1. Criar um Webhook no Supabase (uma nova Edge Function, ex: `bot-webhook`).
2. O bot na VPS passará a fazer requisições `POST` para esse Webhook enviando o QR Code e o Status.
3. O painel passará a escutar (via Supabase Realtime ou polling no banco) o último status recebido.
*(Deixe essa alteração arquitetural como Plano B se a correção de IP falhar).*

---

### Mensagem para o Desenvolvedor (Fernando)
Fernando, eu tentei pingar a sua VPS na porta 4000 agora mesmo aqui pelo seu computador e **a conexão ainda está bloqueada (dando timeout)**. 

Isso significa que o Google Cloud ainda está barrando acessos de fora na porta 4000. Você precisa ir no painel do **Google Cloud Console**, entrar em **VPC Network -> Firewall**, e criar uma regra permitindo tráfego Ingress no protocolo TCP, porta 4000, para a fonte `0.0.0.0/0`. 

O texto acima é exato para o Lovable, mas lembre-se: código nenhum fura o firewall do Google. Libere lá no painel deles!
