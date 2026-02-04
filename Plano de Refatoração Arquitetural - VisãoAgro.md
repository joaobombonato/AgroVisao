Plano de Refatoração Arquitetural - VisãoAgro

Análise completa do projeto VisãoAgro para identificar oportunidades de refatoração e modularização dos arquivos grandes que estão dificultando a manutenção.

Resumo Executivo

O projeto cresceu organicamente e alguns arquivos acumularam muitas responsabilidades. A refatoração proposta visa dividir componentes grandes em módulos menores, extrair lógica reutilizável para hooks e utilitários, e melhorar a separação de responsabilidades.

📊 Diagnóstico Atual

Arquivos Críticos Analisados

Arquivo			Linhas	Tamanho	Problema Principal
AssetListEditor.tsx 	748 	44KB	Componente monolítico com múltiplas responsabilidades
MapScreen.tsx       	778	38KB	Lógica de mapa + UI + estados misturados
TalhaoMapEditor.tsx 	752	36KB	Editor de mapa com lógica complexa acoplada
CreateFazendaScreen.tsx 712	34KB	Código duplicado de geocoding e mapa
AppContext.tsx		690	34KB	Crítico: Context com 7+ responsabilidades
FazendaPerfilEditor.tsx 610	32KB	Duplicação com CreateFazendaScreen
AbastecimentoScreen.tsx 642	31KB	Form + Lista + Modal no mesmo arquivo
multiSourceWeather.ts   597	22KB	Funções de múltiplas APIs não modularizadas

Problemas Identificados
AppContext.tsx
CRUD genérico
Alertas automáticos
Sincronização offline
Gestão de sessão
Cálculos de estoque
Watch de auth
CreateFazendaScreen
Geocoding
FazendaPerfilEditor
MapScreen
Editor de polígonos
Análise satélite
Telemetria
Header/filtros

WARNING

O AppContext.tsx é o gargalo mais crítico. Ele concentra: CRUD, alertas, auth, sync, cálculos e watchers. Qualquer modificação exige entender 700 linhas de código.

🏗️ Arquitetura Proposta

Nova Estrutura de Diretórios

src/
├── context/
│   ├── AppContext.tsx          # Apenas provedor e composição
│   ├── reducer.ts              # (manter)
│   └── hooks/                  # [NOVO]
│       ├── useCRUD.ts          # Operações genéricas
│       ├── useAuth.ts          # Sessão e permissões
│       ├── useAlerts.ts        # Sistema de alertas automáticos
│       ├── useSync.ts          # Fila offline
│       └── useEstoque.ts       # Cálculos de estoque
│
├── hooks/                      # [NOVO] Hooks compartilhados
│   ├── useGeocoding.ts         # Busca de endereço (extraído)
│   ├── useMapEditor.ts         # Lógica de edição de polígonos
│   ├── useImageCrop.ts         # Upload e ajuste de imagem
│   └── useDebounce.ts          # Utilitário
│
├── screens/
│   ├── MapScreen/              # [REFATORAR para pasta]
│   │   ├── index.tsx           # Componente principal
│   │   ├── components/
│   │   │   ├── MapCanvas.tsx
│   │   │   ├── MapControls.tsx
│   │   │   ├── PolygonEditor.tsx
│   │   │   └── SatellitePanel.tsx
│   │   └── hooks/
│   │       └── useMapState.ts
│   │
│   └── AbastecimentoScreen/    # [REFATORAR para pasta]
│       ├── index.tsx
│       ├── components/
│       │   ├── FormAbastecimento.tsx
│       │   ├── ListaAbastecimentos.tsx
│       │   └── CompraCombustivelModal.tsx
│       └── hooks/
│           └── useAbastecimentoForm.ts
│
├── services/
│   └── weather/                # [REFATORAR para pasta]
│       ├── index.ts            # Export consolidado
│       ├── openWeather.ts      # API específica
│       ├── yrNo.ts             # API específica
│       ├── weatherAPI.ts       # API específica
│       ├── tomorrow.ts         # API específica
│       ├── meteoBlue.ts        # API específica
│       └── helpers.ts          # Funções de conversão
│
└── features/settings/components/
    ├── AssetListEditor/        # [REFATORAR para pasta]
    │   ├── index.tsx
    │   ├── components/
    │   │   ├── AssetForm.tsx
    │   │   ├── AssetTable.tsx
    │   │   └── TalhaoMapModal.tsx
    │   └── hooks/
    │       └── useAssetEditor.ts
    │
    └── shared/                 # [NOVO]
        ├── FarmLocationPicker.tsx  # Mapa + Geocoding compartilhado
        └── ImageUploader.tsx       # Upload com crop compartilhado

📋 Plano de Refatoração por Prioridade

Fase 1: Fundações (Crítico)
1.1 Refatorar AppContext.tsx
Objetivo: Dividir o contexto em hooks especializados.

[NEW] useCRUD.ts
Extrair funções: genericSave, genericUpdate, genericDelete, saveRecord, deleteRecord, fetchRecords, fetchDados

[NEW] useAuth.ts
Extrair: checkSession, ensureMembroOwner, logout, trocarFazenda, gestão de permissões

[NEW] 
useAlerts.ts
Extrair: checkFinancialAlerts, checkStockAlerts, checkMaintenanceAlerts, checkPeopleAlerts, checkProfileAlerts

[NEW] 
useSync.ts
Extrair: Lógica de fila offline, processamento de sync, watchers de online/offline

[MODIFY] AppContext.tsx
Reduzir para ~150 linhas, compondo os hooks acima

1.2 Refatorar multiSourceWeather.ts
Objetivo: Cada API em seu próprio módulo.

[NEW] src/services/weather/openWeather.ts
Extrair: fetchOpenWeatherMap + helpers específicos

[NEW] src/services/weather/yrNo.ts
Extrair: fetchYrNo, getYrEmoji, getYrCondition

[NEW] src/services/weather/tomorrow.ts
Extrair: fetchTomorrow, fetchTomorrowFallback, getTomorrowEmoji, getTomorrowCondition

[NEW] src/services/weather/meteoBlue.ts
Extrair: fetchMeteoBlue, getMeteoBlueEmoji, getMeteoBlueCondition

[NEW] src/services/weather/helpers.ts
Mover: getWindDir, convertWindDir, fetchWithTimeout, tipos DailyForecast, MultiSourceWeather

[MODIFY] src/services/multiSourceWeather.ts
Reduzir para ~50 linhas, re-exportando de /weather/

Fase 2: Extração de Hooks Compartilhados

2.1 Geocoding e Mapa Duplicado
Problema: CreateFazendaScreen.tsx e FazendaPerfilEditor.tsx têm código praticamente idêntico para geocoding e manipulação de mapa.

[NEW] src/hooks/useGeocoding.ts
// Extrair de CreateFazendaScreen.tsx:
// - handleGeocode()
// - handleLocationChange()
// - handleCurrentLocation()
// - getREC()
// - handleSelectMunicipio()

[NEW] src/hooks/useImageCrop.ts
// Extrair de CreateFazendaScreen.tsx e FazendaPerfilEditor.tsx:
// - handleImageUpload()
// - handleApplyAdjustment()
// - onStartDrag(), onMoveDrag(), onEndDrag()
// - Estados: zoom, rotation, position

2.2 Editor de Polígonos
[NEW] src/hooks/useMapEditor.ts
Consolidar lógica de edição de polígonos de MapScreen.tsx e TalhaoMapEditor.tsx:

handleClick, createDraggableMarker, updatePreview
startDrawing, startEditing, finishDrawing, cancelDrawing
handleClear, handleUndo, handleSave

Fase 3: Componentização de Telas

3.1 MapScreen

[NEW] src/screens/MapScreen/components/MapCanvas.tsx
Componente Leaflet puro, sem lógica de negócio

[NEW] src/screens/MapScreen/components/PolygonEditor.tsx
Barra de ferramentas de edição

[NEW] src/screens/MapScreen/components/SatellitePanel.tsx
Painel de análise de satélite (NDVI, calendário, legenda)

3.2 AbastecimentoScreen

[NEW] src/screens/AbastecimentoScreen/components/FormAbastecimento.tsx
Formulário de lançamento

[NEW] src/screens/AbastecimentoScreen/components/ListaAbastecimentos.tsx
Tabela de registros

[MODIFY] CompraCombustivelForm
Mover para componente separado (já está inline no arquivo)

3.3 AssetListEditor

[NEW] AssetForm.tsx
Formulário dinâmico de cadastro

[NEW] AssetTable.tsx
Tabela de listagem com ações

Fase 4: Componentes Compartilhados

4.1 FarmLocationPicker

[NEW] src/features/settings/components/shared/FarmLocationPicker.tsx

Componente reutilizável que combina:

Campo de busca de endereço
Mapa com marcador arrastável
Botão "Usar minha localização"
Seletor de município/estado
Usado por: CreateFazendaScreen, FazendaPerfilEditor

⚡ Benefícios Esperados
Métrica				Antes		Depois
Linhas em AppContext.tsx	690		~150
Linhas em MapScreen.tsx		778		~200
Código duplicado geocoding	2 arquivos	1 hook
Arquivos > 500 linhas		7		0
Testabilidade			Baixa		Alta

🧪 Plano de Verificação
Testes Manuais
Como o projeto não possui testes unitários configurados, a verificação será manual:

Após cada fase, executar a aplicação localmente:

cd "c:\Users\Usuário\Desktop\Projeto VisãoAgro"
npm run dev


Checklist de funcionalidades críticas a testar:

 Login/Logout funciona corretamente
 Trocar de fazenda funciona
 Criar novo abastecimento e verificar se aparece na lista
 Criar novo talhão no mapa e salvar
 Verificar painel de clima carrega dados
 Verificar análise de satélite funciona
 Verificar alertas automáticos (estoque, manutenção) são gerados
 Modo offline: fazer operação offline e verificar sync quando online

Verificar console do navegador para erros de runtime

Build de produção deve passar sem erros:

npm run build


Sugestão para o Usuário
IMPORTANT

Recomendo fortemente implementar testes unitários básicos para os hooks extraídos usando Vitest (já compatível com Vite). Isso protegerá contra regressões futuras.

📅 Cronograma Sugerido

Fase			Estimativa	Risco
Fase 1.1 - AppContext	2-3 horas	Alto
Fase 1.2 - Weather	1-2 horas	Baixo
Fase 2 - Hooks		2-3 horas	Médio
Fase 3 - Telas		3-4 horas	Médio
Fase 4 - Shared		1-2 horas	Baixo

Total estimado: 9-14 horas de trabalho

🎯 Recomendação de Abordagem

TIP
Sugiro começar pela Fase 1.2 (multiSourceWeather) por ser a refatoração mais isolada e de menor risco. Isso serve como "aquecimento" antes de mexer no AppContext.

Após cada fase concluída, faríamos um commit separado para facilitar rollback se necessário.

Pergunta para você: Deseja que eu comece por alguma fase específica, ou prefere que siga a ordem sugerida?