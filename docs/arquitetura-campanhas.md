# Arquitetura de Bot de Campanhas

Este documento descreve a arquitetura e funcionamento do envio de campanhas a partir do painel `vitta-connect` para a API do bot `vitta-engenharia-campanha`.

## Fluxo de Funcionamento

1. O usuário acessa a página `Nova Campanha` (`/campanhas/nova`) no painel **Vitta Connect**.
2. Preenche a mensagem, opções de mídia (URL) e a lista de destinatários.
3. Ao enviar, o Frontend dispara um `POST` para `http://<IP-DA-VPS>:4000/api/campanhas/disparar` (este endereço é definido por `VITE_BOT_CAMPANHA_URL`).
4. O bot **Vitta Engenharia Campanha** (rodando via PM2 na VPS) recebe os dados.
5. O bot adiciona todos os destinatários numa **Fila Local** em memória (queue).
6. O loop de processamento da fila do bot envia as mensagens usando a biblioteca `@whiskeysockets/baileys` de forma espaçada (delay de 3 a 6 segundos por envio) para evitar banimento pelo WhatsApp.
7. Se a mensagem possuir uma URL de mídia, ela será enviada anexada.

## Como configurar o Vitta Connect

No arquivo `.env` do `vitta-connect`, defina a URL apontando para a sua VPS. Exemplo:

```env
VITE_BOT_CAMPANHA_URL=http://<SEU_IP_OU_DOMINIO>:4000
```
*(Se estiver rodando localmente para testes, use `http://localhost:4000`)*

## Como rodar o Bot na VPS (Vitta Engenharia Campanha)

O bot é independente e utiliza a biblioteca Baileys. Para implantá-lo na VPS, siga os passos abaixo:

1. Faça o clone ou upload do código da pasta `vitta-engenharia-campanha` para a VPS.
2. Navegue até a pasta do projeto.
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Execute o bot manualmente na primeira vez para escanear o QR Code:
   ```bash
   npm start
   ```
5. Acesse o terminal da VPS. Você verá um QR Code gigante impresso no console. Escaneie-o com o aparelho celular que servirá como número de disparo.
6. Após a conexão confirmada (`✅ Bot conectado ao WhatsApp com sucesso!`), pare a execução com `Ctrl+C`.
7. Inicie-o em background usando o PM2 para garantir que o bot ficará sempre rodando:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

## Notas para os Desenvolvedores Lovable

- O cliente API do Vitta Connect está no arquivo `src/services/apiCampanhas.ts`.
- O dashboard visualiza as campanhas em `src/routes/_app/campanhas.index.tsx`.
- Para adicionar autenticação (ex: tokens JWT, chaves de API), basta acrescentar validações no arquivo `src/index.js` no backend e passá-las pelo cabeçalho (headers) da requisição fetch no painel.

## Troubleshooting

- **QR Code não escaneia:** O baileys usa o `qrcode-terminal`. Diminua o tamanho da fonte do terminal caso o QR saia quebrado.
- **Bot não dispara (Fica sempre como offline):** Apague a pasta `auth_info_baileys` no servidor e rode `npm start` para autenticar novamente.
- **Falha de CORS:** Certifique-se de que não há restrições bloqueando a porta 4000 do VPS.
