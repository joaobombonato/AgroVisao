# 🚜 Fase 8: Inteligência Agronômica e Otimização de Clima

Este plano detalha a evolução do AgroVisão para uma ferramenta de decisão técnica, integrando dados de solo e otimizando o consumo de APIs através de um sistema de memória (cache).

---

## 1. 🧠 Sistema de Memória (Weather Cache)

Para evitar chamadas redundantes às 6+ APIs de clima a cada carregamento, implementaremos uma lógica de persistência similar à utilizada no módulo de satélite, mas com persistência via `localStorage`.

### Estratégia:

- **TTL (Time to Live):** 30 minutos (ajustável).
- **Chave de Cache:** `weather_data_{lat}_{lng}`.
- **Funcionamento:** Antes de disparar o `Promise.all` das APIs, o serviço verificará se existe um dado válido e recente no `localStorage`.

---

## 2. 📊 Inteligência Agronômica (Visual Crossing)

Integração de métricas avançadas para monitoramento da cultura e do solo.

### Novos Dados:

- **Umidade do Solo (Soil Moisture):** 0-10cm e 10-40cm.
- **Evapotranspiração (ET0):** Perda de água por evaporação e transpiração das plantas.
- **Graus-Dia Acumulados (GDD):** Cálculo biológico para prever colheita e estágios fenológicos.

### Integração na UI:

- **Dashboard de Clima:** Nova seção "Análise Técnica" com gráficos de balanço hídrico (Chuva vs ET0).
- **Mapas:** Widget flutuante de solo mostrando a "saúde hídrica" da terra.

---

## 🛠️ Mudanças Propostas

### Serviços

#### [MODIFY] [multiSourceWeather.ts](file:///c:/Users/Usuário/Desktop/Projeto Final São Caetano dividido/src/services/multiSourceWeather.ts)

- Implementar as funções `getWeatherCache` e `setWeatherCache`.
- Atualizar `fetchMultiSourceWeather` para usar o cache antes de buscar dados externos.

#### [NEW] [visualCrossingService.ts](file:///c:/Users/Usuário/Desktop/Projeto Final São Caetano dividido/src/services/visualCrossingService.ts)

- Serviço dedicado para buscar dados de solo e GDD.

### Telas e Componentes

#### [MODIFY] [WeatherDashboard.tsx](file:///c:/Users/Usuário/Desktop/Projeto Final São Caetano dividido/src/components/weather/WeatherDashboard.tsx)

- Adicionar cartões de "Inteligência Agronômica".
- Implementar gráfico de barras comparativo (Chuva vs Evaporação).

#### [MODIFY] [MapScreen.tsx](file:///c:/Users/Usuário/Desktop/Projeto Final São Caetano dividido/src/screens/MapScreen.tsx)

- Criar o `SoilStatusWidget` para exibir umidade do solo em tempo real sobre o mapa.

---

## 📅 Cronograma

| Tarefa                                             | Esforço |
| :------------------------------------------------- | :------ |
| Implementar Cache Layer em `multiSourceWeather.ts` | 45min   |
| Criar `visualCrossingService.ts` (Solo/ET/GDD)     | 1.5h    |
| UI: Seção Técnica no `WeatherDashboard`            | 2h      |
| UI: Widget de Solo no `MapScreen`                  | 1h      |
| Testes e Refinamentos                              | 1h      |

**Status:** ⏳ Aguardando Aprovação
