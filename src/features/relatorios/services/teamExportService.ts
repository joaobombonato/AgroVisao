import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { U } from '../../../utils';
import { APP_VERSION } from '../../../constants';
import { downloadFile } from '../../../utils/downloadFile';

export interface TeamExportOptions {
  title: string;
  filename: string;
  farmName: string;
  subtitle: string;
  logo: string;
  columnStyles?: Record<number, any>;
}

const INDIGO_DARK = [40, 53, 147]; // #283593
const TEXT_DARK = [31, 41, 55]; // #1F2937

export const teamExportService = {
  exportToPDF: async (columns: string[], data: any[][], options: TeamExportOptions) => {
    const doc = new jsPDF('p', 'mm', 'a4') as any; // Portrait mode is usually better for Team Lists
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    let startY = 40;

    // --- Header Rendering ---
    const renderHeader = (isFirstPage: boolean) => {
      doc.setFillColor(INDIGO_DARK[0], INDIGO_DARK[1], INDIGO_DARK[2]);
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

    // --- Table Rendering ---
    const tableOptions: any = {
      startY,
      head: [columns],
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: INDIGO_DARK,
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
        fillColor: [249, 250, 251]
      },
      columnStyles: options.columnStyles || {
        0: { halign: 'left' }
      },
      didDrawPage: (dataInfo: any) => {
        if (dataInfo.pageNumber > 1) {
          renderHeader(false);
        }
      }
    };

    // Fix autoTable plugin loading
    if (typeof autoTable === 'function') {
      autoTable(doc, tableOptions);
    } else if (autoTable && typeof (autoTable as any).default === 'function') {
      (autoTable as any).default(doc, tableOptions);
    } else if (typeof (doc as any).autoTable === 'function') {
      (doc as any).autoTable(tableOptions);
    }

    // --- Footer Rendering ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Relatório gerado pelo sistema AgroVisão - ${APP_VERSION} — Solução PráticoApp`, 14, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 25, pageHeight - 10);
    }

    doc.save(`${options.filename}.pdf`);
  },

  exportToExcel: async (dataRaw: any[], options: TeamExportOptions) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AgroVisão';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Equipe');

    // 1. Título principal (Mesclado)
    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = options.title.toUpperCase();
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF283593' } }; // Indigo Dark
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // 2. Fazenda e Subtítulo
    ws.mergeCells('A2:F2');
    const farmCell = ws.getCell('A2');
    farmCell.value = `${options.farmName} | ${options.subtitle}`;
    farmCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4B5563' } };
    farmCell.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.addRow(['']); // Blank row

    if (dataRaw.length === 0) {
      ws.addRow(['Nenhum membro encontrado neste período.']);
      
      const buffer = await workbook.xlsx.writeBuffer();
      downloadFile(new Blob([buffer]), `${options.filename}.xlsx`, 'xlsx');
      return;
    }

    // 3. Headers of the table
    const columns = Object.keys(dataRaw[0]);
    const headerRow = ws.addRow(columns);

    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Blue-900 equivalent
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
      const row = ws.addRow(columns.map(col => rowObj[col]));
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
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
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

    // 6. Rodapé
    ws.addRow(['']);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const genRow = ws.addRow([`Gerado em: ${dateStr} ${timeStr} — AgroVisão ${APP_VERSION}`]);
    genRow.getCell(1).font = { italic: true, size: 8, color: { argb: 'FF64748B' } };
    ws.mergeCells(`A${genRow.number}:F${genRow.number}`);

    const buffer = await workbook.xlsx.writeBuffer();
    downloadFile(new Blob([buffer]), `${options.filename}.xlsx`, 'xlsx');
  }
};
