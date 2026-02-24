import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { APP_VERSION } from '../../../constants';
import { downloadFile } from '../../../utils/downloadFile';
import { CADASTROS_RAW_KEY_MAP } from '../config/reportDefinitions';

export interface RegistriesExportOptions {
  title: string;
  filename: string;
  farmName: string;
  subtitle: string;
  logo: string;
  selectedColumns?: string[];
}

const ZINC_DARK = [63, 63, 70]; // #3f3f46
const TEXT_DARK = [31, 41, 55]; // #1F2937

export const registriesExportService = {
  exportToPDF: async (
    columnsMap: Record<string, string[]>,
    dataMap: Record<string, any[][]>,
    options: RegistriesExportOptions
  ) => {
    const doc = new jsPDF('p', 'mm', 'a4') as any;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    let startY = 40;
    
    // Header Renderer
    const renderHeader = (isFirstPage: boolean) => {
      doc.setFillColor(ZINC_DARK[0], ZINC_DARK[1], ZINC_DARK[2]);
      doc.rect(0, 0, pageWidth, 25, 'F');

      if (options.logo) {
        try {
          doc.addImage(options.logo, 'PNG', 14, 5, 15, 15);
        } catch (e) {
          console.warn('Erro ao inserir logo no PDF', e);
        }
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(options.title.toUpperCase(), 35, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(options.farmName, 35, 19);

      if (isFirstPage) {
        doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text(options.subtitle, 14, 32);
      }
    };

    renderHeader(true);

    const categories = Object.keys(dataMap);

    categories.forEach((categoryKey, index) => {
      const data = dataMap[categoryKey];
      const cols = columnsMap[categoryKey];

      if (!data || data.length === 0) return;

      // Se não houver espaço suficiente para a próxima tabela, quebre a página *antes*
      if (startY > pageHeight - 40 && index > 0) {
        doc.addPage();
        startY = 40;
      }

      // Título da Sub-Categoria (Nome do Cadastro)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(ZINC_DARK[0], ZINC_DARK[1], ZINC_DARK[2]);
      doc.text(categoryKey, 14, startY);
      startY += 6;

      const tableOptions: any = {
        startY,
        head: [cols],
        body: data,
        theme: 'grid',
        headStyles: {
          fillColor: ZINC_DARK,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: TEXT_DARK
        },
        alternateRowStyles: {
          fillColor: [244, 244, 245]
        },
        didDrawPage: (dataInfo: any) => {
          if (dataInfo.pageNumber > 1 && dataInfo.cursor.y === dataInfo.settings.margin.top) {
             renderHeader(false);
          }
        }
      };

      if (typeof autoTable === 'function') {
        autoTable(doc, tableOptions);
      } else if (autoTable && typeof (autoTable as any).default === 'function') {
        (autoTable as any).default(doc, tableOptions);
      } else if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable(tableOptions);
      }

      startY = (doc as any).lastAutoTable?.finalY + 15 || startY + 15;
    });

    // --- Footer Rendering ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Relatório gerado pelo sistema AgroVisão - ${APP_VERSION} — Solução PráticoApp`, 14, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 25, pageHeight - 10);
    }

    const pdfBlob = doc.output('blob');
    await downloadFile(pdfBlob, `${options.filename}.pdf`, 'pdf');
  },

  exportToExcel: async (rawMap: Record<string, any[]>, options: RegistriesExportOptions) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AgroVisão';
    workbook.created = new Date();

    const categories = Object.keys(rawMap);
    
    if (categories.length === 0) {
      const ws = workbook.addWorksheet('Cadastros Vazio');
      const INDIGO_DARK = 'FF283593';
      const INDIGO = 'FF3F51B5';
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const titleRow = ws.addRow([`${options.title.toUpperCase()}`]);
      titleRow.font = { bold: true, size: 16, color: { argb: INDIGO_DARK } };
      titleRow.height = 28;

      const farmRow = ws.addRow([`Propriedade: ${options.farmName || 'Fazenda'}`]);
      farmRow.font = { size: 10, color: { argb: 'FF6E6E6E' } };

      const periodRow = ws.addRow([options.subtitle || '']);
      periodRow.font = { bold: true, size: 10, color: { argb: INDIGO } };

      const genRow = ws.addRow([`Gerado em: ${dateStr} ${timeStr} — AgroVisão ${APP_VERSION}`]);
      genRow.font = { size: 8, color: { argb: 'FF999999' }, italic: true };
      
      ws.addRow([]);
      ws.addRow(['Nenhum cadastro selecionado ou sem dados.']);
      const buffer = await workbook.xlsx.writeBuffer();
      downloadFile(new Blob([buffer]), `${options.filename}.xlsx`, 'xlsx');
      return;
    }

    for (const catKey of categories) {
      const dataRaw = rawMap[catKey];
      if (!dataRaw || dataRaw.length === 0) continue;

      // Nome da aba limitado a 31 caracteres
      const sheetName = catKey.slice(0, 31).replace(/[^\w\s-]/gi, '');
      const ws = workbook.addWorksheet(sheetName);

      const INDIGO_DARK = 'FF283593';
      const INDIGO = 'FF3F51B5';
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Linha 1: Título
      const titleRow = ws.addRow([`${options.title.toUpperCase()} - ${catKey.toUpperCase()}`]);
      titleRow.font = { bold: true, size: 16, color: { argb: INDIGO_DARK } };
      titleRow.height = 28;

      // Linha 2: Propriedade
      const farmRow = ws.addRow([`Propriedade: ${options.farmName || 'Fazenda'}`]);
      farmRow.font = { size: 10, color: { argb: 'FF6E6E6E' } };

      // Linha 3: Período
      const periodRow = ws.addRow([options.subtitle || '']);
      periodRow.font = { bold: true, size: 10, color: { argb: INDIGO } };

      // Linha 4: Geração
      const genRow = ws.addRow([`Gerado em: ${dateStr} ${timeStr} — AgroVisão ${APP_VERSION}`]);
      genRow.font = { size: 8, color: { argb: 'FF999999' }, italic: true };

      // Linha 5: Separador
      ws.addRow([]);

      // 3. Headers of the table
      const columnsKeys = Object.keys(dataRaw[0]);
      const headerRow = ws.addRow(columnsKeys);

      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27272A' } }; // Zinc 800
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      // 4. Data Rows
      dataRaw.forEach((rowObj, index) => {
        const row = ws.addRow(columnsKeys.map(col => rowObj[col]));
        const isEven = index % 2 === 0;

        row.eachCell((cell) => {
          cell.font = { size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4F5' } }; // Zinc 100
          }
        });
      });

      // 5. Ajuste de larguras (Width Auto-fit)
      ws.columns.forEach((column) => {
        let maxLen = 10;
        column.eachCell!({ includeEmpty: false }, (cell) => {
          if (typeof cell.row === 'number' && cell.row > 3) {
            const v = cell.value ? cell.value.toString() : '';
            if (v.length + 2 > maxLen) maxLen = v.length + 2;
          }
        });
        column.width = maxLen < 30 ? maxLen : 30;
      });


    }

    const buffer = await workbook.xlsx.writeBuffer();
    downloadFile(new Blob([buffer]), `${options.filename}.xlsx`, 'xlsx');
  }
};
