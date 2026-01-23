# 🛰️ Plano de Inteligência Geoespacial - AgroVisão v4.0

## Visão Geral

Integrar capacidades de localização precisa, previsão meteorológica estilo Meteoblue e monitoramento via satélite com **dupla visualização** (NDVI + Imagem Real).

> [!IMPORTANT]
> Foco em APIs **100% gratuitas**. Delimitação apenas da fazenda toda.

---

## 🎯 Requisitos Visuais

### Previsão do Tempo (Estilo Meteoblue)

**Elementos visuais desejados:**

1. **Gráfico de Temperatura** - Linha com gradiente amarelo/verde mostrando máx/mín
2. **Precipitação** - Barras azuis com intensidade (mm/h)
3. **Cobertura de Nuvens** - Fundo em escala de cinza
4. **Vento** - Setas de direção + linha de velocidade/rajadas
5. **Previsibilidade** - Percentual de confiança da previsão
6. **14 dias de previsão** com ícones de condição

### Imagens de Satélite (Dupla Visualização)

**Dois modos de visualização:**
| Modo | Descrição | Fonte |
|------|-----------|-------|
| **NDVI/Vegetação** | Mapa de saúde das plantas (verde = saudável, vermelho = estresse) | Agromonitoring ou Sentinel |
| **Imagem Real (True Color)** | Foto real do satélite Sentinel-2 | Sentinel Hub ou Agromonitoring |

### Map Screen

#### [MODIFY] [MapScreen.tsx](file:///c:/Users/Usuário/Desktop/Projeto Final São Caetano dividido/src/screens/MapScreen.tsx)

- [x] Implementar navegação por datas
- [x] Adicionar seletor de camadas (NDVI, Cor Real, etc)
- [x] Ajustar layout para exibir controles sobre o mapa
- [x] Implementar "Modo Edição" não-destrutivo para polígonos
- [x] Implementar mascaramento "Spotlight" para foco na área
- [x] Implementar sistema de Abas (Mapa vs. Análise Satélite)
- [x] Criar visualização "Foto Isolada" com fundo preto total
- [x] Implementar carrossel de datas com miniaturas (se possível)

**Funcionalidades:**

- Toggle para alternar entre NDVI e True Color
- Histórico semanal (últimas 4-8 imagens)
- Legenda de cores para NDVI
- Data da captura do satélite

---

## 📊 Stack Técnico Final

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────┤
│  📍 MAPAS:                                                   │
│     react-leaflet + OpenStreetMap (base)                    │
│     GeoJSON para polígono da fazenda                        │
│                                                              │
│  🌤️ GRÁFICOS CLIMA (Estilo Meteoblue):                      │
│     Recharts ou Chart.js                                    │
│     ├── AreaChart (temperatura com gradiente)               │
│     ├── BarChart (precipitação)                             │
│     └── Custom (setas de vento)                             │
│                                                              │
│  🛰️ SATÉLITE:                                               │
│     Leaflet TileLayer para NDVI/True Color                  │
│     Carousel para histórico semanal                         │
├─────────────────────────────────────────────────────────────┤
│                      APIS                                    │
├─────────────────────────────────────────────────────────────┤
│  🌤️ CLIMA:                                                  │
│     └── Open-Meteo (previsão 16 dias, histórico 80 anos)   │
│                                                              │
│  🛰️ SATÉLITE:                                               │
│     └── Agromonitoring (NDVI + True Color tiles)           │
│         - /satellite/imagery → lista de imagens            │
│         - /satellite/stats → estatísticas NDVI             │
│         - Tiles XYZ para Leaflet                            │
│                                                              │
│  📍 GEOCODING:                                               │
│     └── Nominatim (OpenStreetMap)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Mudanças no Banco de Dados

```sql
-- Tabela fazendas: geolocalização
ALTER TABLE fazendas
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geojson JSONB; -- Polígono da propriedade
```

---

## 📅 Cronograma Detalhado

| #                | Tarefa                               | Esforço     | Dependência |
| ---------------- | ------------------------------------ | ----------- | ----------- |
| 1.1              | Campos lat/lng no Supabase           | 30min       | -           |
| 1.2              | Mapa Leaflet no cadastro de fazenda  | 2h          | 1.1         |
| 1.3              | Autocomplete de endereço (Nominatim) | 1h          | 1.2         |
| 1.4              | Desenho de polígono da fazenda       | 3h          | 1.2         |
| **Fase 1 Total** | **Geolocalização**                   | **~1 dia**  |             |
| 2.1              | Integração Open-Meteo API            | 2h          | 1.1         |
| 2.2              | Gráfico de temperatura (Recharts)    | 3h          | 2.1         |
| 2.3              | Gráfico de precipitação              | 2h          | 2.1         |
| 2.4              | Indicadores de vento                 | 2h          | 2.1         |
| 2.5              | Ícones de condição do tempo          | 1h          | 2.1         |
| **Fase 2 Total** | **Previsão Clima**                   | **~2 dias** |             |
| 4.1              | Criar conta Agromonitoring           | 30min       | -           |
| 4.2              | Registrar polígono na API            | 1h          | 1.4         |
| 4.3              | Buscar imagens NDVI                  | 2h          | 4.2         |
| 4.4              | Buscar imagens True Color            | 2h          | 4.2         |
| 4.5              | Toggle NDVI/Real + Carousel          | 3h          | 4.3, 4.4    |
| 4.6              | Legenda de cores NDVI                | 1h          | 4.3         |
| **Fase 4 Total** | **Satélite**                         | **~2 dias** |             |

**Total estimado: 5-7 dias de desenvolvimento**

---

## Status

- [x] Plano aprovado pelo usuário
- [ ] Fase 1: Geolocalização
- [ ] Fase 2: Previsão do Tempo
- [ ] Fase 4: Satélite/NDVI
