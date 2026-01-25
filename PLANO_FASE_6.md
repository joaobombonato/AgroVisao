# 🚀 PLANO MESTRE - FASE 6: Identidade & Onboarding

Fase dedicada a profissionalizar a "cara" do AgroVisão e permitir que um usuário gerencie múltiplas fazendas ou seja convidado para outras.

---

## 🎨 6.1 Identidade Visual (Branding AgroVisão)

- **Objetivo:** Diferenciar "AgroVisão" (Solução) de "Fazenda São Caetano" (Cliente).
- **Ações:**
  - [ ] Criar Logo Oficial **AgroVisão** (Tech + Agro).
  - [ ] **Redesign da Tela de Login (`AuthScreen`):**
    - Layout profissional (Screen Split ou Card Central Moderno).
    - Fundo com imagem de alta qualidade (lavoura/tecnologia).
    - Inputs e botões com design system aprimorado.
  - [ ] **Página de Cadastro Diferenciada:**
    - Não ser apenas um "toggle", mas uma rota ou slide separado com mais destaque.

## 🏢 6.2 Multi-Fazendas & Onboarding

- **Objetivo:** Permitir que o usuário escolha em qual fazenda vai trabalhar ao entrar.
- **Fluxo Proposto:**
  1. **Login** -> Sucesso.
  2. **Verificação:** Usuário tem fazendas vinculadas?
     - **NÃO:** Redireciona para `CreateFazendaScreen` (Wizard Inicial).
     - **SIM (1):** Redireciona direto para o Dashboard (Comportamento Atual).
     - **SIM (+1):** Redireciona para `FazendaSelectionScreen`.
- **Tela de Seleção (`FazendaSelectionScreen`):**
  - Card Grid com as fazendas disponíveis.
  - Botão "Criar Nova Fazenda".
  - Botão "Gerenciar Convites" (Futuro).

## ⚙️ 6.3 Configuração da Fazenda

- **Objetivo:** Dar identidade à fazenda do usuário.
- **Ações:**
  - [ ] **Configurações Gerais (`ConfiguracoesScreen`):**
    - Adicionar seção "Perfil da Propriedade".
    - Campos: Nome Oficial, Localização (Cidade/Estado), Tamanho (ha), Proprietário.
    - **Upload de Logo:** Permitir trocar o ícone do trator pela logo da fazenda.

## 🤝 6.4 Gestão de Equipe (Convites)

- **Objetivo:** Adicionar pessoas à fazenda.
- **Local:** Aba Configurações > "Equipe & Acessos".
- **Funcionalidade:**
  - Lista de Membros Atuais.
  - Botão "Convidar por E-mail".
  - (Backend): Tabela `fazenda_membros` já existe, precisa de interface para insert.

---

### ✅ Checklist de Entrega

- [ ] 6.1 Redesign Login (AgroDev)
- [ ] 6.2 Lógica de Seleção de Fazenda
- [ ] 6.3 Wizard de Criação de Fazenda
- [ ] 6.4 Configurações de Perfil da Fazenda
