# Instalação do Bot de Campanhas Vitta na VPS

Este é o guia passo-a-passo 100% "plug and play" para instalar o bot na VPS (`35.253.246.93`).

## 1. Conecte-se na VPS
Acesse a máquina via SSH:
```bash
ssh root@35.253.246.93
# (Ou o usuário apropriado se não for root)
```

## 2. Clone o repositório do Bot
```bash
cd /opt
# (Ou a pasta de sua preferência)
git clone https://github.com/Ferdinandobot/vitta-engenharia-campanha.git
cd vitta-engenharia-campanha
```

## 3. Instale as dependências Node.js
Certifique-se de que o Node.js e o NPM estão instalados. Em seguida, instale as bibliotecas:
```bash
npm install
```

## 4. Inicie o Bot via PM2
O projeto já inclui um arquivo `ecosystem.config.cjs` pronto para rodar na porta `4000`.
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

## 5. Libere a porta no Firewall (Se aplicável)
A porta `4000` precisa estar aberta para receber os chamados do site. Se você usa o firewall do Linux (UFW):
```bash
ufw allow 4000
```
*(Não esqueça de verificar as regras de firewall no Google Cloud Console / AWS, caso seja bloqueado por padrão).*

---

## 6. Configuração no Painel do Vitta Connect
No seu projeto `vitta-connect` (Frontend), vá no arquivo `.env` (ou variáveis de ambiente do Lovable) e adicione a seguinte linha:

```env
VITE_BOT_CAMPANHA_URL=http://35.253.246.93:4000
```

## 7. Como Conectar o WhatsApp
A integração agora é visual e integrada!

1. Abra o painel **Vitta Connect**.
2. Navegue até a aba **Campanhas WhatsApp**.
3. Se o bot estiver desconectado, o próprio site lerá as informações da VPS e desenhará o **QR Code na sua tela**.
4. Abra o WhatsApp no celular que fará os envios > "Aparelhos Conectados" > "Conectar Aparelho".
5. Escaneie o QR Code que apareceu na tela do seu site.
6. A página atualizará instantaneamente para o status **Online**.

Pronto! Você pode começar a criar as campanhas imediatamente.

## 8. Como Agendar Disparos
1. Na tela "Nova Campanha", preencha a lista de números e a mensagem.
2. No campo de data/hora, selecione o momento futuro desejado (ex: amanhã às 15:00).
3. Ao clicar em **Agendar Campanha**, a solicitação será enviada imediatamente para a memória da VPS.
4. O bot na VPS ficará em loop e, no momento exato agendado, iniciará a distribuição gradativa para os contatos.
