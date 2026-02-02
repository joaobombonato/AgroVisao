# 💡 Ideias para Atualizações Futuras - AgroVisão

Este documento serve como um repositório de inovações e melhorias propostas para as próximas fases do projeto, com foco em aumentar a precisão agronômica e a eficiência operacional.

## 🚀 Próximas Implementações Sugeridas

### 1. Integração de Pluviometria Real no Bioclima (Ideia Prioritária)

- **O que é:** Substituir os dados históricos de chuva da API (que são estimativas por satélite) pelos dados reais lançados pelo usuário na aba "Chuvas".
- **Benefício:** O "Saldo Hídrico" e o "Perfil de Solo" passariam a refletir 100% a realidade do pluviômetro da fazenda, eliminando distorções de satélite.
- **Complexidade:** Média (exige cruzamento de tabelas no `agronomicService`).

### 2. Normalização de NDVI por Talhão

- **O que é:** Criar um histórico de vigor vegetativo (NDVI) específico para cada talhão, permitindo comparar o desenvolvimento da safra atual com a média histórica do mesmo local.
- **Benefício:** Identificar anomalias de crescimento (pragas ou falhas de adubação) muito antes de serem visíveis a olho nu.

### 3. Automação e Mensagens via WhatsApp

- **O que é:** Envio automático de mensagens para confirmação de cadastros e abertura/fechamento de Ordens de Serviço (OS).
- **Benefício:** Comunicação instantânea e registro formal das operações no celular de cada operador ou gestor.

### 4. Alertas Críticos via WhatsApp/Push

- **O que é:** Notificar o gestor automaticamente quando:
  - O estoque de Diesel atingir o nível crítico configurado.
  - Uma máquina estiver a **X horas** da revisão preventiva (utilizando o limite definido nos _Parâmetros Gerais_).
  - O VPD (Estresse Atmosférico) ultrapassar 2.0 kPa em horários críticos de aplicação.
- **Benefício:** Resposta rápida a problemas críticos sem necessidade de monitorar o dashboard 24/7.

### 5. Notificações & Automação (Diferenciais "Uau")

- **WhatsApp via DeepLink:** Inserir botões "Enviar para WhatsApp" em Ordens de Serviço (OS) e Recomendações.
  - **Como funciona:** Gera um link `wa.me/?text=...` com um resumo profissional da operação (Insumo, Dose, Talhão, Responsável) para facilitar o envio para o aplicador.
- **Alertas Automatizados:** Confirmar e automatizar o envio de alertas de estoque crítico e vencimento de documentos.

### 6. Memória de Longo Prazo e Histórico (Supabase)

- **O que é:** Utilizar o Supabase como uma "memória central", armazenando não apenas dados de tabelas, mas cronogramas de previsões passadas e cache de imagens de satélite históricas.
- **Benefício:** Análise retroativa completa para entender por que uma safra foi melhor que a outra baseado no histórico exato de dados que tínhamos na época.

### 7. Controle de Presença em Tempo Real (Realtime Presence)

- **O que é:** Implementar o recurso de "Realtime Presence" do Supabase para visualizar quem está com o sistema aberto na fazenda no exato momento.
- **Benefício:** Melhor coordenação de equipe e visibilidade de quem está operando o sistema ao vivo.

### 8. IA Colaborativa (Arquitetura Pronta para Insights)

- **O que é:** Manter a estrutura do código 100% modularizada e limpa para que IAs possam ler os dados e gerar relatórios automáticos.
- **Benefício:** O sistema "falará" com o produtor, dando dicas de ouro baseadas em dados tabelados e limpos (ex: "Notei que o consumo do trator X subiu 15%, verifique os filtros").

### 9. Integração com Estações Meteorológicas IoT

- **O que é:** Conectar diretamente o sistema a estações físicas (ex: Davis, Pessl) instaladas na sede.
- **Benefício:** Dados em tempo real de vento (velocidade e direção) e temperatura, fundamentais para decidir a hora exata da pulverização.

### 10. Reconhecimento de Pragas por Imagem (IA)

- **O que é:** Adicionar uma funcionalidade na aba de Monitoramento onde o operador tira uma foto da folha/inseto e a IA identifica a praga.
- **Benefício:** Rapidez no diagnóstico e recomendação imediata do insumo correto.

### 11. Relatório de Custo por Hectare Detalhado

- **O que é:** Unificar todos os custos (Insumos, Combustível, Refeições, Manutenção) e dividir pela área total de cada talhão.
- **Benefício:** Saber exatamente qual talhão deu mais lucro e qual "comeu" mais dinheiro na safra.

### 12. Gestão de Equipe via Convites Oficiais (Supabase Auth)

- **O que é:** Ajustar o fluxo de gestão de equipe para utilizar o sistema de convites nativo do Supabase (`Invite User`).
- **Benefício:** Processo de cadastro mais seguro, profissional e automatizado, aproveitando o template de e-mail que já deixamos configurado no dashboard do Supabase.

### 13. Indicadores Personalizados (BI) & Exportação

- **Exportação de Dados:** Adicionar botões na aba "Gráficos" para exportar as tabelas e dados brutos para **PDF e CSV**.
- **Faturamento & Custos:** Implementar relatórios consolidados de faturamento de refeições e extrato detalhado de abastecimento por centro de custo.

---

_Documento atualizado em: 02/02/2026_
