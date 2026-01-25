# Documentação: Sistema de Permissões AgroVisão

Este documento registra a arquitetura e as regras do **Quadro de Comando de Permissões**, garantindo uma gestão dinâmica e segura da fazenda.

## 👑 Hierarquia de Cargos

O sistema é estruturado em 5 níveis de acesso pré-definidos:

- **Proprietário**: Perfil Master (Admin). Possui acesso irrestrito e travado em 100% por segurança.
- **Gerente**: Foco na gestão operacional e de equipe de campo.
- **Administrativo**: Foco em dados financeiros, documentos e trâmites de escritório.
- **Operador**: Foco em lançamentos básicos e operacionais do dia a dia.
- **Consultor Agrícola**: Acesso técnico focado em recomendações e análise de mapas/satélite.

## 🛠️ Arquitetura Técnica

- **Contexto**: As permissões são carregadas dinamicamente no `state.permissions` via `AppContext.tsx`.
- **Persistência**: As customizações são salvas no banco de dados (`fazendas/config/permissions`).
- **Segurança de Dados**: Ordens de Serviço (OS) são filtradas modularmente; o usuário só vê registros de telas às quais tem permissão.
- **UI/UX**: Uso de ícones, chaves de ativação (toggles) e cores temáticas vinculadas aos módulos (Link Visual).

## 🏭 Matriz "Original de Fábrica" (Padrões)

Abaixo, a configuração inicial de cada cargo ao criar uma nova propriedade:

### 📱 Acesso às Telas

| Tela                 | Proprietário | Gerente | Administrativo | Operador | Consultor |
| :------------------- | :----------: | :-----: | :------------: | :------: | :-------: |
| 📊 Dashboard         |      ✅      |   ✅    |       ✅       |    ❌    |    ❌     |
| 📈 Gráficos          |      ✅      |   ✅    |       ✅       |    ❌    |    ✅     |
| ⚙️ Configurações     |      ✅      |   ❌    |       ❌       |    ❌    |    ❌     |
| 🔔 Ordens de Serviço |      ✅      |   ✅    |       ✅       |    ✅    |    ✅     |
| 🍴 Refeições         |      ✅      |   ✅    |       ✅       |    ✅    |    ❌     |
| ⛽ Abastecimento     |      ✅      |   ✅    |       ✅       |    ✅    |    ❌     |
| 🍃 Recomendações     |      ✅      |   ✅    |       ❌       |    ✅    |    ✅     |
| 🔧 Manutenção        |      ✅      |   ✅    |       ❌       |    ✅    |    ❌     |
| 📦 Estoque           |      ✅      |   ✅    |       ✅       |    ✅    |    ✅     |
| 📂 Documentos        |      ✅      |   ✅    |       ✅       |    ✅    |    ✅     |
| ⚡ Energia           |      ✅      |   ✅    |       ✅       |    ✅    |    ❌     |
| 🌧️ Chuvas            |      ✅      |   ✅    |       ✅       |    ✅    |    ✅     |
| 🗺️ Mapas e Satélite  |      ✅      |   ✅    |       ❌       |    ✅    |    ✅     |
| 📑 Relatórios        |      ✅      |   ✅    |       ✅       |    ✅    |    ✅     |

### ⚡ Ações Permitidas

| Ação                     | Proprietário | Gerente | Administrativo | Operador | Consultor |
| :----------------------- | :----------: | :-----: | :------------: | :------: | :-------: |
| Registrar Compra Diesel  |      ✅      |   ✅    |       ✅       |    ❌    |    ❌     |
| Registrar Compra Insumos |      ✅      |   ✅    |       ✅       |    ❌    |    ❌     |
| Criar Recomendação       |      ✅      |   ✅    |       ❌       |    ❌    |    ✅     |
| Registrar Chuvas         |      ✅      |   ✅    |       ✅       |    ✅    |    ✅     |
| Editar Mapa/Talhões      |      ✅      |   ✅    |       ❌       |    ✅    |    ✅     |
| Excluir Registros        |      ✅      |   ❌    |       ❌       |    ❌    |    ❌     |

---

_Nota: Qualquer permissão (exceto do Proprietário) pode ser alterada manualmente no Quadro de Comando pelo administrador da conta._
