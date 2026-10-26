# Erro de Timeout no Lovable: Bot Inacessível

## O Problema
O painel do Lovable está disparando o erro:
`Bot inacessível em http://35.253.246.93:4000: TimeoutError: Signal timed out.`

O problema **não** é o código do bot nem o firewall do GCP. A máquina real onde o bot está rodando (`tcgmind`) está com a porta 4000 perfeitamente aberta, gerando QR codes e respondendo com sucesso, como prova a sua segunda print (`NOVO QR CODE GERADO. VISÍVEL NO PAINEL E NO TERMINAL`). 

O motivo do erro é que o **IP da sua VPS mudou** (provavelmente após um reinício da máquina no Google Cloud). O IP antigo era `35.253.246.93`, mas o IP atual da máquina é **`35.253.246.93`**. 

Como o Lovable está tentando bater no IP velho, a conexão cai no vazio (Timeout).

## Como Resolver (Para o Lovable / Desenvolvedor)

1. **Sincronizar o Código (GitHub):** 
   Eu já alterei o arquivo `src/lib/campanhas.functions.ts` e o `.env` do repositório substituindo o IP velho pelo novo. O Lovable só precisa fazer um "Pull" ou sincronizar com o GitHub para pegar essa última alteração do `DEFAULT_BOT_URL`.
   
2. **Atualizar Variáveis de Ambiente no Lovable (Se houver):**
   Se o Lovable estiver usando variáveis de ambiente próprias (Secrets) no ambiente de deploy ou preview, é obrigatório alterar a variável `BOT_CAMPANHA_URL` para o novo IP:
   `http://35.253.246.93:4000`

---
*Nota sobre o log `BadRequestError: request aborted` na VPS:*
Isso apareceu no log apenas porque os testes de conexão (ping) que fiz no terminal desconectaram antes do servidor terminar de responder. É inofensivo e não afeta o funcionamento do bot. O importante é a linha seguinte, provando que o bot está vivo e gerando QRs. Assim que o Lovable apontar para o IP correto, a imagem aparecerá na tela.
