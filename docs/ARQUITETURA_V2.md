# Mentora OAB 49 — Arquitetura V2 Cloud + IA

## Objetivo
Evoluir o PWA atual para uma plataforma de estudos com sincronização em nuvem, banco de questões, histórico de respostas, desempenho e pesquisa jurídica assistida por IA, mantendo o modo local/offline como fallback.

## Stack escolhida

- Frontend: GitHub Pages (atual)
- Banco/Auth/Backend: Supabase Free
- IA: Gemini Developer API (free tier), chamada somente no backend
- Pesquisa jurídica: LexML SRU (oficial/Senado), dados abertos do STJ e, quando aplicável, API Pública DataJud/CNJ
- Offline: localStorage/PWA permanece funcionando mesmo sem nuvem

## Princípios de segurança

1. GEMINI_API_KEY nunca vai para o GitHub Pages nem para o navegador.
2. A chave fica como Secret da Edge Function do Supabase.
3. O navegador recebe apenas SUPABASE_URL e a chave pública/anon do projeto.
4. Row Level Security (RLS) separa os dados de cada estudante.
5. A IA recebe o mínimo possível de dados pessoais. Nome e e-mail não são enviados ao modelo.
6. Toda resposta jurídica gerada pela IA deve informar as fontes recuperadas.
7. Quando não houver base suficiente, a resposta deve assumir incerteza e recomendar consulta à fonte oficial.

## Fluxo de pesquisa jurídica

Usuária -> Edge Function `legal-ai`

1. valida sessão da usuária;
2. normaliza a pergunta;
3. consulta LexML SRU por legislação/jurisprudência;
4. opcionalmente consulta fontes complementares oficiais;
5. guarda/cacheia metadados das fontes;
6. envia ao Gemini somente a pergunta + trechos/metadados recuperados;
7. exige resposta estruturada com explicação, pontos de prova e fontes;
8. registra a interação para histórico de estudos.

## Fontes iniciais

- LexML Brasil: legislação, jurisprudência, proposições e metadados jurídicos
- STJ Dados Abertos: jurisprudência e conjuntos públicos
- CNJ/DataJud: metadados processuais, quando fizer sentido
- Links oficiais curados: Planalto, STF, STJ, TST, CNJ, OAB e FGV

## Dados

Tabelas principais:

- profiles
- disciplines
- topics
- questions
- attempts
- study_sessions
- reviews
- simulations
- simulation_items
- ai_interactions
- legal_search_cache

## Estratégia adaptativa

O motor calcula por disciplina/assunto:

- taxa de acerto;
- volume respondido;
- reincidência de erros;
- intervalo desde último contato;
- desempenho em simulados;
- confiança informada;
- tempo até 09/05/2027.

O plano diário dá prioridade a revisões vencidas, assuntos abaixo da meta e questões nunca respondidas.

## Modo híbrido

Sem login ou sem internet: continua local.
Com login: sincroniza na nuvem e permite estudar em mais de um aparelho.

A nuvem nunca deve impedir o uso do aplicativo local.

## Custos

Arquitetura desenhada para os free tiers. Limites e condições dos provedores podem mudar; monitorar antes de ampliar para muitos usuários.
