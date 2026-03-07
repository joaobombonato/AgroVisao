/**
 * mealsExportService — Exportação de relatórios de Refeições.
 * Delega ao baseExportService (sem personalizações específicas).
 */
import { exportToPDF, exportToExcel, type ExportOptions } from './baseExportService';

export { type ExportOptions };

export const mealsExportService = {
  exportToPDF: async (columns: string[], data: any[][], options: ExportOptions) => {
    return exportToPDF(columns, data, options);
  },

  exportToExcel: async (data: any[], options: ExportOptions) => {
    return exportToExcel(data, options);
  }
};
