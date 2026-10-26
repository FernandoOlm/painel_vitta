# Vitta Connect

Prompt para Desenvolvimento do Sistema Vitta Engenharia SST no LovableObjetivo GeralDesenvolver um sistema web completo e intuitivo para a Vitta Engenharia SST utilizando a plataforma Lovable. O sistema deve automatizar os processos comerciais, de cadastro, financeiro e de produção, conforme o fluxo de trabalho detalhado, com foco em uma interface humanizada e fácil de usar.Requisitos de AutenticaçãoO sistema deve incluir um módulo de autenticação onde a criação de novos usuários será controlada por um administrador (admin) ou por um usuário com acesso de desenvolvedor (root/dev access). Isso assegura um controle de acesso rigoroso e centralizado.Estrutura de Dados e Módulos Funcionais1. Módulo Comercial•Entidade: Contato•Campos: Nome, Telefone, E-mail, Tipo (Cliente/Não Cliente).•Funcionalidades:•Importação de Contatos: Interface para upload de listas de contatos (CSV/Excel).•Categorização Automática/Manual: Lógica para classificar contatos como 'Cliente' ou 'Não Cliente'.•Disparo de Campanhas: Integração para envio de mensagens via WhatsApp e e-mail para listas de contatos segmentadas.2. Módulo Geral - Cadastro•Entidade: Empresa•Campos: Nome da Empresa, CNPJ, Endereço, Contato, etc.•Funcionalidades:•Cadastro de Empresas: Formulário para registro detalhado de empresas clientes.•Entidade: Trabalhador•Campos: Nome, CPF, Data de Nascimento, Função, Empresa Vinculada, etc.•Funcionalidades:•Cadastro de Trabalhadores: Formulário para registro de dados dos trabalhadores.•Associação de Ações: Interface para vincular treinamentos e exames específicos a cada trabalhador.•Acompanhamento de Vencimentos: Dashboard/Relatório para monitorar os vencimentos de ações por trabalhador.•Entidade: Laudo (Geral)•Campos: Tipo de Laudo, Data de Emissão, Data de Vencimento, Arquivo (PDF), Trabalhador/Empresa Associada.•Funcionalidades:•Cadastro de Laudos: Formulário para registro de diversos tipos de laudos.•Gestão de Vencimentos: Alertas e relatórios sobre laudos próximos ao vencimento.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8f18e7e3-a781-4bbe-a71e-559bf389bbeb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
