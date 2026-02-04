# Backup de Segurança - VisãoAgro

**Data:** 2026-02-02 23:31

## Motivo

Backup antes da refatoração arquitetural para modularização dos arquivos grandes.

## Arquivos Incluídos

| Arquivo                 | Origem                            | Tamanho |
| ----------------------- | --------------------------------- | ------- |
| AppContext.tsx          | src/context/                      | 33KB    |
| reducer.ts              | src/context/                      | 7KB     |
| multiSourceWeather.ts   | src/services/                     | 22KB    |
| MapScreen.tsx           | src/screens/                      | 38KB    |
| CreateFazendaScreen.tsx | src/screens/                      | 34KB    |
| AbastecimentoScreen.tsx | src/screens/                      | 31KB    |
| TalhaoMapEditor.tsx     | src/features/settings/components/ | 36KB    |
| FazendaPerfilEditor.tsx | src/features/settings/components/ | 32KB    |
| AssetListEditor.tsx     | src/features/settings/components/ | 44KB    |

## Como Restaurar

Se algo der errado durante a refatoração, copie o arquivo de volta:

```powershell
# Exemplo para restaurar AppContext.tsx
Copy-Item -Path "backup_2026-02-02\AppContext.tsx" -Destination "src\context\AppContext.tsx" -Force
```

## Plano de Refatoração

Veja: `.gemini/antigravity/brain/.../implementation_plan.md`
