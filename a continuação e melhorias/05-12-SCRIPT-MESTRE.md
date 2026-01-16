# SCRIPT MESTRE — Transformar Mini-Aeagro Local em SaaS Real (Supabase + API)

Quero que você atue como ARQUITETO DE SOFTWARE + ENGENHEIRO FULLSTACK.

Estou enviando um projeto React + Tailwind + Vite que já possui:

- UI completa  
- PWA funcional  
- Módulos operacionais prontos (chuva, energia, refeições, abastecimento, documentos, recomendações etc.)  
- SmartListManager (cadastros locais)  
- AppContext contendo todos os dados em memória  
- Fluxo de OS automático por módulo  
- Lógicas internas (auto-preenchimento, cálculos, histórico etc.)

Este projeto hoje funciona totalmente local-first (sem banco real).  
Quero transformá-lo em um **SaaS real**, inspirado no Aeagro, com:

- Supabase (Postgres)  
- API real  
- CRUD persistente  
- Services para lógica de negócio  
- Hooks para cada módulo  
- Dashboard dinâmico  
- Gráficos personalizáveis  
- Evolução para offline-first no futuro  

---

# 🎯 OBJETIVO PRINCIPAL

Migrar meu projeto local-first para arquitetura SaaS real **sem reescrever do zero** e **sem perder as lógicas internas já implementadas**.

---

# 🧩 FASE 1 — Infraestrutura (OBRIGATÓRIA)

1) Criar o esquema completo de banco Supabase com tabelas:

- farms  
- fields  
- crops  
- safra  
- machines  
- machine_readings  
- products  
- product_classes  
- recipes  
- recipe_items  
- fuel_tanks  
- fuel_purchases  
- fuel_usage  
- meals  
- rain  
- energy  
- documents  
- os  
- centers_of_cost  
- users  

2) Criar policies RLS seguras  
3) Criar buckets para upload de documentos  
4) Gerar arquivo `database_schema.sql` completo

---

# 🧩 FASE 2 — Reestruturação do Frontend

Transformar AppContext em arquitetura profissional:

- `/api/supabaseClient.ts`
- `/services`  
- `/hooks`
- `/store` (Zustand)
- Migrar SmartListManager para CRUD Supabase
- Remover dados locais / dispatch

---

# 🧩 FASE 3 — Migração Módulo por Módulo (ORDEM OBRIGATÓRIA)

1. Cadastros  
2. Refeições  
3. Energia  
4. Chuvas  
5. Abastecimento  
6. Compras combustível  
7. OS  
8. Documentos (upload real)  
9. Recomendações (receitas + itens)

Cada módulo deve entregar:

- CRUD Supabase  
- Service com lógica  
- Hook React  
- Atualização das screens  
- Manutenção das regras atuais  

---

# 🧩 FASE 4 — Dashboard Real

- Criar tabela `user_charts`  
- API de métricas  
- Gráficos dinâmicos  
- Filtros  

---

# 🧩 FASE 5 — Offline-first (Opcional)

- IndexedDB  
- Queue  
- Sincronização

---

# 🧩 O QUE VOCÊ DEVE FAZER AO RECEBER ESTE SCRIPT:

- Aguardar meus arquivos  
- Analisar AppContext, Shared.tsx, utils.ts, constants.ts e todas as screens  
- Mapear o que já existe → banco  
- Criar o esquema completo  
- Iniciar pela Fase 1 automaticamente  
- Gerar código completo, organizado e incremental  
- Não reescrever tudo  
- Não pular etapas  
- Manter a lógica atual  

---

Após colar esse script, enviarei os arquivos do meu projeto e começaremos pela **FASE 1**.
