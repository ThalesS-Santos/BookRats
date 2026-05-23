# Especificacoes do Projeto

## Objetivo

Transformar leitura em experiencia social: progresso de leitura, anotacoes contextuais e interacao entre leitores.

## Funcionalidades Nucleares

1. Biblioteca

- adicionar/remover livros
- atualizar progresso
- status de leitura com `BOOK_STATUS`

2. Echoes

- anotacoes por pagina
- resposta em thread
- reacao com clap

3. Social

- amizades
- grupos
- notificacoes
- ranking

4. Gamificacao

- streak
- badges
- indicadores de progresso

## Requisitos Tecnicos

- mobile-first com Expo/React Native
- armazenamento e sync em Firestore
- validacao defensiva de entrada
- regras de seguranca por menor privilegio
- testes automatizados e quality gates

## Nao-Funcionais

- confiabilidade: error boundary + logger
- rastreabilidade: logs estruturados
- manutencao: arquitetura modular e docs atualizados
