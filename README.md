# Leilao de Quadros

Projeto de leilao online de quadros.
O usuario cria conta, entra nos leiloes, faz lances e acompanha o resultado.
Quem terminar com o maior lance no prazo vence o item.

Tambem tem painel admin para gerenciar leiloes, acompanhar participantes, vencedores e resgates.

## Tecnologias usadas

- JavaScript
	Linguagem principal do app mobile e da API.

- React Native + Expo + Expo Router
	Interface mobile, navegação por tabs/rotas e recursos nativos (camera, galeria, biometria, localizacao).

- Node.js + Express
	Backend REST para autenticacao, leiloes, lances, carteira simulada e fluxo de resgate.

- PostgreSQL + pg
	Persistencia dos usuarios, leiloes, lances, carteira e historico de transacoes.

- JWT + Zod
	JWT para sessao/autorizacao e Zod para validacao dos payloads da API.

- Multer + Supabase Storage (principal) + Azure Blob (alternativo)
	Upload e armazenamento de imagens (perfil e midia dos leiloes).
	No projeto atual, se tiver config do Supabase ele usa Supabase; Azure entra como opcao alternativa;
	se nenhum dos dois estiver configurado, usa armazenamento local na pasta uploads.

## Estrutura de pastas

- app/
	Rotas/telas do Expo Router.
	Inclui telas publicas (login/register), tabs do usuario e area admin.

- app/(tabs)/
	Telas principais do usuario: inicio, leiloes, conquistas, perfil e configuracoes.

- app/admin/
	Telas do administrador (resumo, leiloes, participantes, vencedores e resgates).

- src/auth/
	Camada de autenticacao e integracao com API no app.
	Contem context, servicos, storage local e componentes relacionados ao login/perfil.

- components/
	Componentes reutilizaveis de UI e comportamento (ex: botoes de aba, icones, componentes de tema).

- hooks/
	Hooks utilitarios de tema e esquema de cor.

- constants/
	Constantes de tema e configuracoes visuais compartilhadas.

- assets/
	Imagens e recursos estaticos do app.

- server/
	Backend Node.js/Express separado do app mobile.

- server/src/routes/
	Endpoints da API (auth, auctions e admin).

- server/src/db/
	Conexao com banco, inicializacao e schema SQL.

- server/src/services/
	Regras de negocio de apoio (agendador de leiloes, storage etc.).

## Testes

Foram criados testes unitarios no backend para validar funcoes principais.

- Local dos testes
	server/tests/

- Arquivos de teste:
  
	authSchema.test.js

	authMiddleware.test.js

	servicoArmazenamento.test.js

- Como rodar
	Entrar na pasta server e executar:
	node --test tests/*.test.js

## Integrantes

- Bruno Lourenco Neves - 202312035
- Leonardo Motta dos Santos - 202222267
- Gabriel Oliveira Arruda Rodrigues - 202311407
