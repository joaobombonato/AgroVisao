import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../../context/AppContext';
import { fuelExportService } from '../services/fuelExportService';
import { osExportService } from '../services/osExportService';
import { weatherExportService } from '../services/weatherExportService';
import { registriesExportService } from '../services/registriesExportService';
import { mealsExportService } from '../services/mealsExportService';
import { U } from '../../../utils';
import {
  RELATORIOS,
  ABAST_KEY_MAP,
  ABAST_RAW_KEY_MAP,
  ABAST_COLUMN_STYLES,
  ABAST_TOTAL_COLS,
  OS_KEY_MAP,
  OS_RAW_KEY_MAP,
  OS_COLUMN_STYLES,
  OS_TOTAL_COLS,
  CADASTROS_TOTAL_COLS,
  CADASTROS_CATEGORIAS
} from '../config/reportDefinitions';

// ==========================================
// BUILDERS (agora em arquivos separados)
// ==========================================
import { buildAbastData } from '../builders/fuelReportBuilder';
import { buildRefeicaoData } from '../builders/mealsReportBuilder';
import { buildChuvasData } from '../builders/weatherReportBuilder';
import { buildOSData } from '../builders/osReportBuilder';
import { buildCadastrosData } from '../builders/cadastrosReportBuilder';

// ==========================================
// HOOK: useRelatorios
// ==========================================

export default function useRelatorios() {
  const { setTela, state, fazendaSelecionada } = useAppContext();
  const [search, setSearch] = useState('');
  const [dateStart, setDateStart] = useState(U.todayIso().slice(0, 8) + '01');
  const [dateEnd, setDateEnd] = useState(U.todayIso());

  const [modalConfig, setModalConfig] = useState<{
    reportId: string;
    reportTitle: string;
    exportType: 'pdf' | 'excel';
  } | null>(null);

  // Filtro de busca + Permissões
  const filtrados = RELATORIOS.filter(r => {
    // 1. Check de Busca
    const matchesSearch = r.titulo.toLowerCase().includes(search.toLowerCase()) || 
                          r.desc.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Check de Permissão Dinâmica
    const { rolePermissions } = state;
    if (rolePermissions?.screens && rolePermissions.screens[r.modulo] === false) {
      return false;
    }

    return true;
  });

  // Abre modal ao invés de exportar direto
  const openExportModal = (type: 'pdf' | 'excel', relId: string, titulo: string) => {
    setModalConfig({ reportId: relId, reportTitle: titulo, exportType: type });
  };

  // ==========================================
  // EXPORTAÇÃO PRINCIPAL
  // ==========================================
  const handleExport = async (type: 'pdf' | 'excel', relId: string, titulo: string, selectedColumns?: string[]) => {
    const loadingToast = toast.loading(`Preparando ${type.toUpperCase()}: ${titulo}...`);

    try {
      const { dados, ativos } = state;
      const fNome = fazendaSelecionada?.nome || state.fazendaNome || 'Fazenda';
      const logo = fazendaSelecionada?.logo_base64 || fazendaSelecionada?.config?.logo_base64 || '';
      const periodStr = `Período: ${U.formatDate(dateStart)} até ${U.formatDate(dateEnd)}`;

      let columns: string[] = [];
      let data: any[][] | Record<string, any[][]> = [];
      let rawData: any[] | Record<string, any[]> = [];
      let filename = titulo.replace(/\s+/g, '_');
      let summaryData: | { totalsRow?: any[] | Record<string, any[]>; machineSummary?: { maquina: string; litros: number; custo: number; horasKm: number; isKM: boolean }[] } | undefined;

      // ── Coleta de dados por tipo ──
      if (relId === 'custo_abast') {
        ({ columns, data, rawData, summaryData } = buildAbastData(dados, ativos, dateStart, dateEnd));
      } else if (relId === 'fat_refeicoes') {
        ({ columns, data, rawData } = buildRefeicaoData(dados));
      } else if (relId === 'extrato_chuvas') {
        ({ columns, data, rawData } = buildChuvasData(dados));
      } else if (relId === 'os') {
        ({ columns, data, rawData, summaryData } = buildOSData(state.os, ativos, dateStart, dateEnd));
      } else if (relId === 'cadastros') {
        const sel = selectedColumns || [];
        if (sel.length === 0) {
            toast.error("Selecione ao menos um cadastro para exportar.");
            toast.dismiss(loadingToast);
            return;
        }
        ({ columns, data, rawData } = buildCadastrosData(state, sel));
      } else {
        toast.error("Este relatório ainda está em desenvolvimento.");
        toast.dismiss(loadingToast);
        return;
      }

      // ── Personalização ──
      const totalColsForReport = relId === 'custo_abast' ? ABAST_TOTAL_COLS : relId === 'os' ? OS_TOTAL_COLS : relId === 'cadastros' ? CADASTROS_TOTAL_COLS : 0;
      
      // Para Cadastros, filtramos as chaves de categorias pai para contar apenas as colunas reais
      const filteredSelected = relId === 'cadastros' && selectedColumns 
        ? selectedColumns.filter(k => !CADASTROS_CATEGORIAS.includes(k))
        : selectedColumns;

      const isCustomized = filteredSelected && filteredSelected.length < totalColsForReport;
      const customTag = isCustomized ? ' (Personalizado)' : '';

      const options = {
        title: titulo + customTag,
        filename: filename + (isCustomized ? '_Personalizado' : ''),
        farmName: fNome,
        subtitle: periodStr + (isCustomized ? `  •  ${filteredSelected?.length} de ${totalColsForReport} colunas` : ''),
        logo,
        summaryData,
        selectedColumns,
        columnStyles: relId === 'custo_abast' ? { ...ABAST_COLUMN_STYLES } : relId === 'os' ? { ...OS_COLUMN_STYLES } : undefined
      };

      // ── PDF ──
      if (type === 'pdf') {
        let finalColumns = columns;
        let finalData = data;

        if (selectedColumns && (relId === 'custo_abast' || relId === 'os') && selectedColumns.length < totalColsForReport) {
          const keyMap = relId === 'custo_abast' ? ABAST_KEY_MAP : OS_KEY_MAP;
          const indices = selectedColumns.map(k => keyMap[k]).filter(i => i !== undefined).sort((a, b) => a - b);
          finalColumns = indices.map(i => columns[i]);
          
          if (Array.isArray(data)) {
            finalData = data.map(row => indices.map(i => row[i]));
          } else {
             finalData = {};
             const typedData = data as Record<string, any[][]>;
             Object.keys(typedData).forEach(key => {
                 (finalData as Record<string, any[][]>)[key] = typedData[key].map(row => indices.map(i => row[i]));
             });
          }

          if (summaryData && summaryData.totalsRow) {
            
            if (Array.isArray(summaryData.totalsRow)) {
                const origTotals = summaryData.totalsRow;
                const numCols = finalColumns.length;
                const newTotals = new Array(numCols).fill('');
                newTotals[0] = origTotals[0]; // Texto descritivo
                
                if (relId === 'custo_abast') {
                    const maqIdx = finalColumns.findIndex(c => c.includes('Máquina'));
                    if (maqIdx >= 0) newTotals[maqIdx] = 'TOTAIS';
                    const litIdx = finalColumns.indexOf('Litros');
                    if (litIdx >= 0) newTotals[litIdx] = origTotals[2]; // Valor de litros
                    const custoIdx = finalColumns.findIndex(c => c.includes('Custo') || c.includes('Valor'));
                    if (custoIdx >= 0) newTotals[custoIdx] = origTotals[9];
                }
                summaryData.totalsRow = newTotals;
            } else {
                const origTotalsObj = summaryData.totalsRow as Record<string, any[]>;
                const numCols = finalColumns.length;
                const newTotalsObj: Record<string, any[]> = {};
                
                Object.keys(origTotalsObj).forEach(key => {
                    const origTotals = origTotalsObj[key];
                    const newTotals = new Array(numCols).fill('');
                    newTotals[0] = origTotals[0];
                    
                    const descIdx = finalColumns.findIndex(c => c.includes('Referência') || c.includes('Descrição'));
                    if (descIdx >= 0) newTotals[descIdx] = 'TOTAIS';
                    const custoIdx = finalColumns.findIndex(c => c.includes('Custo') || c.includes('Valor'));
                    if (custoIdx >= 0) newTotals[custoIdx] = origTotals[7];
                    
                    newTotalsObj[key] = newTotals;
                });
                
                summaryData.totalsRow = newTotalsObj;
            }
          }

          if (options.columnStyles) {
            const oldStyles = options.columnStyles as Record<number, any>;
            const newStyles: Record<number, any> = {};
            indices.forEach((origIdx, newIdx) => {
              if (oldStyles[origIdx]) newStyles[newIdx] = oldStyles[origIdx];
            });
            options.columnStyles = newStyles as any;
          }
        }

        if (relId === 'os') {
            await osExportService.exportToPDF(finalColumns, finalData as any, options as any);
        } else if (relId === 'extrato_chuvas') {
            await weatherExportService.exportToPDF(finalColumns, finalData as any[][], options as any);
        } else if (relId === 'fat_refeicoes') {
            await mealsExportService.exportToPDF(finalColumns, finalData as any[][], options as any);
        } else if (relId === 'cadastros') {
            await registriesExportService.exportToPDF(finalColumns as any, finalData as any, options as any);
        } else {
            await fuelExportService.exportToPDF(finalColumns, finalData as any[][], options as any);
        }
      }
      // ── Excel ──
      else {
        let finalRawData = rawData;
        // Notice we exclude 'cadastros' here too because selectedColumns applies at the builder level
        if (selectedColumns && (relId === 'custo_abast' || relId === 'os')) {
          const rawKeyMap = relId === 'custo_abast' ? ABAST_RAW_KEY_MAP : OS_RAW_KEY_MAP;
          const selectedRawKeys = selectedColumns.map(k => rawKeyMap[k]).filter(Boolean);
          
          if (Array.isArray(rawData)) {
             finalRawData = rawData.map((row: any) => {
                const filtered: Record<string, any> = {};
                selectedRawKeys.forEach(rk => { filtered[rk] = row[rk]; });
                return filtered;
             });
          } else {
             finalRawData = {};
             const typedRawData = rawData as Record<string, any[]>;
             Object.keys(typedRawData).forEach(key => {
                 (finalRawData as Record<string, any[]>)[key] = typedRawData[key].map((row: any) => {
                     const filtered: Record<string, any> = {};
                     selectedRawKeys.forEach(rk => { filtered[rk] = row[rk]; });
                     return filtered;
                 });
             });
          }
        }

        if (relId === 'os') {
            await osExportService.exportToExcel(finalRawData as any, options as any);
        } else if (relId === 'extrato_chuvas') {
            await weatherExportService.exportToExcel(finalRawData as any[], options as any);
        } else if (relId === 'fat_refeicoes') {
            await mealsExportService.exportToExcel(finalRawData as any[], options as any);
        } else if (relId === 'cadastros') {
            await registriesExportService.exportToExcel(finalRawData as any, options as any);
        } else {
            await fuelExportService.exportToExcel(finalRawData as any[], options as any);
        }
      }

      toast.success(`${titulo} exportado com sucesso!`);
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast.error("Erro ao gerar arquivo. Tente novamente.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  return {
    setTela,
    search, setSearch,
    dateStart, setDateStart,
    dateEnd, setDateEnd,
    modalConfig, setModalConfig,
    filtrados,
    openExportModal,
    handleExport
  };
}
