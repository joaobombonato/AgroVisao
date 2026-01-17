# 🚀 PLANO MESTRE - FASE 5: Inteligência & Automação

Este documento é o guia definitivo para a conclusão das funcionalidades avançadas da Fazenda São Caetano. Ele integra o "New Roadmap" com as solicitações específicas de relatórios, manutenção e estoque.

---

## 🏗️ 5.1 Infraestrutura de Dados & Novos Módulos

### [NEW] Módulo de Manutenção (`ManutencaoScreen`)

- **Objetivo:** Listar máquinas e seu status de revisão.
- **Campos:** Máquina, Última Revisão (h), Próxima Revisão (h), Status (Em dia / Vencida).
- **Ação:** Histórico de trocas de óleo e peças.

### [NEW] Módulo de Estoque (`EstoqueScreen`)

- **Objetivo:** Controle de produtos (defensivos, sementes, peças).
- **Integração:** Cruzamento com a tela de Ativos (Produtos) para mostrar saldo atual.
- **Alerta:** Aviso visual se o saldo estiver abaixo do mínimo.

### [NEW] Central de Relatórios (`RelatoriosScreen`)

- **Objetivo:** Gerar listagens limpas e exportáveis (PDF/CSV) que não cabem em gráficos.
- **Relatórios Iniciais:**
  - **Faturamento Refeições:** Resumo mensal por fornecedor/cozinha.
  - **Custo de Abastecimento:** Detalhado por centro de custo.
  - **Extrato de Chuvas:** Acumulado mensal p/ Safra.

---

## ⛽ 5.2 Refinamento: Abastecimento & Máquinas

- [ ] **Cadastro de Máquinas (Complexo):** Alterar de 'simple' para 'complex' em `ASSET_DEFINITIONS`.
  - Novos campos: `horimetroRevisao` (Meta), `dataVencimentoDoc` (Documentação).
- [ ] **Alerta de Manutenção:**
  - Na hora de salvar o abastecimento, se `horimetroAtual >= horimetroRevisao`, cria-se um Alerta no Dashboard e na tela de Manutenção.
- [ ] **Gestão de Custos:** Confirmar e travar a lógica: `Valor do Abastecimento = Litros * Preço da Última Compra` (Salvar no banco).

---

## 📊 5.3 Inteligência (Dashboard & BI)

- [ ] **Gráficos BI Avançados:**
  - **Comparativo Mensal:** Consumo de Diesel (Este Mês vs Mês Anterior).
  - **Consumo de Energia:** Gasto R$ Atual vs Meta configurada.
- [ ] **Alertas Condicionais (Dashboard):**
  - Card: ⚠️ **Necessidade de Manutenção** (Baseado nos horímetros).
  - Card: 📄 **Documentos Vencendo** (Informação vinda de: Máquinas -> Doc Trator | Equipe -> CNH).
  - Card: 🌧️ **Volume Crítico de Chuva** (Alerta se Chuva em 24h > X mm).

---

## 🔔 5.4 Notificações & Automação ("Uau")

- [ ] **WhatsApp DeepLink:**
  - Botão na `OsScreen`: "Enviar Resumo OS p/ WhatsApp".
  - Botão na `RecomendacoesScreen`: "Enviar Receita p/ Aplicador".
  - Formato: `wa.me/?text=[Resumo formatado do registro]`.
- [ ] **PDF Export:** Adicionar botão de exportar relatório simples em PDF na Central de Relatórios.

---

## 🧠 5.5 IA & Performance

- [ ] **AgroIA (Experimental):** Usar Chrome Built-in AI para um botão "Resumir este mês" na tela de Gráficos.
- [ ] **Performance (Lazy Loading):** Implementar `React.lazy` nas rotas principais para que o navegador só baixe o código da tela que o usuário clicar.

---

### ✅ Checklist de Progresso

- [ ] 5.1 Novos Módulos
- [ ] 5.2 Abastecimento & Máquinas
- [ ] 5.3 Dashboard & BI
- [ ] 5.4 Automação WhatsApp
- [ ] 5.5 IA & Performance
