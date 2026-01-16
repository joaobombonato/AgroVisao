# CHECKLIST DE MIGRAÇÃO — Mini-Aeagro → SaaS Real

## ✔ Preparação
- [ ] Criar projeto Supabase
- [ ] Copiar DATABASE_URL para ambiente da API
- [ ] Criar bucket "documentos"

---

## ✔ FASE 1 — Banco de Dados
- [ ] Criar tabelas de cadastros (farms, talhoes, culturas, safra)
- [ ] Criar tabelas operacionais (energia, chuva, refeições)
- [ ] Criar tabelas mecanização (máquinas, abastecimento, compras)
- [ ] Criar tabelas agronômicas (receitas, itens, produtos, classes)
- [ ] Criar tabelas OS
- [ ] Criar policies RLS
- [ ] Criar SQL final (`database_schema.sql`)

---

## ✔ FASE 2 — Arquitetura Frontend
- [ ] Criar pasta `/api`
- [ ] Criar `supabaseClient.ts`
- [ ] Criar pasta `/services` por módulo
- [ ] Criar pasta `/hooks`
- [ ] Criar `/store` com Zustand
- [ ] Migrar AppContext → apenas navegação e UI
- [ ] Migrar SmartListManager → CRUD real

---

## ✔ FASE 3 — Migração por Módulo
- [ ] Cadastros (ativos)
- [ ] Refeições
- [ ] Energia
- [ ] Chuvas
- [ ] Abastecimento
- [ ] Compras combustível
- [ ] OS
- [ ] Documentos
- [ ] Recomendações (receitas + itens)

---

## ✔ FASE 4 — Dashboard
- [ ] Criar tabela `user_charts`
- [ ] Criar API de métricas
- [ ] Criar componentes de gráficos
- [ ] Criar editor de gráficos

---

## ✔ FASE 5 — Offline-first
- [ ] IndexedDB
- [ ] Sincronização
- [ ] Queue offline
