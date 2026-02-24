// Feature: Relatórios
// Barrel export para acesso externo ao módulo

export { default as RelatoriosScreen } from './screens/RelatoriosScreen';
export { fuelExportService } from './services/fuelExportService';
export { osExportService } from './services/osExportService';
export { weatherExportService } from './services/weatherExportService';
export { mealsExportService } from './services/mealsExportService';
export { REPORT_COLUMNS, getDefaultColumns } from './config/reportColumns';
