import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { U } from '../../../utils';
import { downloadFile } from '../../../utils/downloadFile';
import { AGROVISAO_LOGO_B64 } from '../../../assets/agrovisaoBase64';
import { PRATICO_LOGO_B64 } from '../../../assets/praticoBase64';
import { APP_VERSION } from '../../../constants';

export interface OSExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  logo?: string;
  farmName?: string;
  columnStyles?: any;
  summaryData?: {
    totalsRow?: Record<string, any[]>;
  };
}

const sanitizeFilename = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
};

const generateFormattedFilename = (title: string, farmName: string, ext: string) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const cleanTitle = title.toUpperCase();
  const cleanFarm = farmName || 'Fazenda';
  return `AgroVisão ${cleanTitle} ${dateStr} - ${cleanFarm}.${ext}`;
};

const drawPDFHeader = (doc: any, options: OSExportOptions, pageWidth: number) => {
  const { title, subtitle, logo, farmName } = options;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  doc.setFillColor(248, 249, 250);
  doc.rect(0, 0, pageWidth, 33, 'F');

  if (logo) {
    try {
      const imgProps = doc.getImageProperties(logo);
      const ratio = imgProps.width / imgProps.height;
      
      const rectX = 15;
      const rectY = 9;
      const rectW = 30;
      const rectH = 16;
      const maxLogoW = rectW - 0.2; 
      const maxLogoH = rectH - 0.2;
      
      let imgW = maxLogoW;
      let imgH = imgW / ratio;
      
      if (imgH > maxLogoH) {
        imgH = maxLogoH;
        imgW = imgH * ratio;
      }

      const xPos = rectX + (rectW - imgW) / 2;
      const yPos = rectY + (rectH - imgH) / 2;
      
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(225, 225, 225); 
      doc.roundedRect(rectX, rectY, rectW, rectH, 2, 2, 'FD'); 
      const format = logo.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(logo, format, xPos, yPos, imgW, imgH);
    } catch (e) {
      console.warn('Falha ao adicionar logotipo', e);
    }
  }

  const startX = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(title.toUpperCase(), startX, 15, { align: 'left' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text(`Propriedade: ${farmName || 'Fazenda'}`, startX, 21, { align: 'left' });
  
  if (subtitle) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(63, 81, 181);
    doc.text(subtitle, startX, 26, { align: 'left' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`${dateStr} ${timeStr}`, pageWidth - 16, 11, { align: 'right' }); 

  try {
    doc.addImage(AGROVISAO_LOGO_B64, 'PNG', pageWidth - 56, 12.5, 42, 11.5);
  } catch (e) {}

  doc.setDrawColor(63, 81, 181); 
  doc.setLineWidth(1.5);
  doc.line(14, 33, pageWidth - 14, 33); 
};

export const osExportService = {
  exportToPDF: async (columns: string[], dataGrouped: Record<string, any[][]>, options: OSExportOptions) => {
    const doc = new jsPDF('l', 'mm', 'a4') as any;
    const pageWidth = doc.internal.pageSize.width;

    let startY = 40;
    const groups = ['Pendentes', 'Confirmadas', 'Canceladas'];

    let isFirstGroup = true;

    for (const group of groups) {
      const gData = dataGrouped[group];
      if (!gData || gData.length === 0) continue;

      if (!isFirstGroup) {
          doc.addPage();
          startY = 40;
      }
      isFirstGroup = false;

      // Group Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      
      if (group === 'Pendentes') doc.setTextColor(245, 158, 11);
      else if (group === 'Confirmadas') doc.setTextColor(16, 185, 129);
      else doc.setTextColor(239, 68, 68);
      
      doc.text(`Status: ${group.toUpperCase()}`, 14, startY);
      startY += 4;

      const curData = [...gData];

      const tableOptions = {
        head: [columns],
        body: curData,
        startY: startY,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        theme: 'striped' as any,
        styles: { 
            fontSize: 7.5, 
            cellPadding: 3, 
            textColor: [60, 60, 60] as any,
            halign: 'center' as any
        },
        headStyles: {
          fillColor: [63, 81, 181] as any,
          textColor: [255, 255, 255] as any,
          fontStyle: 'bold' as any,
          halign: 'center' as any
        },
        alternateRowStyles: {
          fillColor: [249, 250, 255] as any
        },
        columnStyles: options.columnStyles
      };

      if (typeof autoTable === 'function') {
        autoTable(doc, tableOptions);
      } else if (autoTable && typeof (autoTable as any).default === 'function') {
        (autoTable as any).default(doc, tableOptions);
      } else if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable(tableOptions);
      }

      let finalY = (doc as any).lastAutoTable?.finalY || startY;

      // === LINHA DE TOTAIS ===
      if (options.summaryData?.totalsRow && options.summaryData.totalsRow[group]) {
          const orig = options.summaryData.totalsRow[group];
          const totalsTableOptions = {
              head: [] as any[],
              body: [[orig[0]]],
              startY: finalY + 2,
              theme: 'plain' as any,
              styles: {
                  fontSize: 8,
                  cellPadding: 3,
                  textColor: [255, 255, 255] as any, // White text
                  fillColor: [40, 53, 147] as any,   // INDIGO_DARK
                  fontStyle: 'bold' as any,
                  halign: 'left' as any
              },
              margin: { left: 14, right: 14 },
              columnStyles: {
                  0: { cellWidth: 'auto' as any }
              }
          };

          if (typeof autoTable === 'function') {
            autoTable(doc, totalsTableOptions);
          } else if (autoTable && typeof (autoTable as any).default === 'function') {
            (autoTable as any).default(doc, totalsTableOptions);
          } else if (typeof (doc as any).autoTable === 'function') {
            (doc as any).autoTable(totalsTableOptions);
          }

          finalY = (doc as any).lastAutoTable?.finalY || finalY + 10;
      }

      // Add a page break if needed, otherwise just add spacing
      startY = finalY + 12;
    }

    // Footers and Headers in ALL pages (post-processing)
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Draw the main header over the top margin area
        drawPDFHeader(doc, options, pageWidth);
        
        // Linha do rodapé
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.5);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        
        // Rodapé Esq (Autoria e Versão)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Relatório gerado pelo sistema AgroVisão - ${APP_VERSION} — Solução PráticoApp`, 14, pageHeight - 10);

        // Rodapé Centro (Paginação X - Y)
        doc.text(`Página ${i} - ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Rodapé Dir (Logo PráticoApp)
        try {
            doc.addImage(PRATICO_LOGO_B64, 'PNG', pageWidth - 34, pageHeight - 14, 20, 5);
        } catch (e) {
            doc.text('PráticoApp', pageWidth - 14, pageHeight - 10, { align: 'right' });
        }
    }

    const finalFilename = generateFormattedFilename(options.title || 'Relatório OS', options.farmName || '', 'pdf');
    const pdfBlob = doc.output('blob');
    await downloadFile(pdfBlob, finalFilename, 'pdf');
  },

  exportToExcel: async (dataGrouped: Record<string, any[]>, options: OSExportOptions) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AgroVisão';
    wb.created = new Date();

    const INDIGO = 'FF3F51B5';
    const INDIGO_DARK = 'FF283593';
    const WHITE = 'FFFFFFFF';

    const groups = ['Pendentes', 'Confirmadas', 'Canceladas'];

    for (const group of groups) {
      const gData = dataGrouped[group];
      if (!gData || gData.length === 0) continue;

      const ws = wb.addWorksheet(group, { properties: { defaultColWidth: 16 } });
      const keys = Object.keys(gData[0]);

      // --- CABEÇALHO DA PLANILHA ---
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Linha 1: Título
      const titleRow = ws.addRow([`RELATÓRIO DE ORDENS DE SERVIÇO - ${group.toUpperCase()}`]);
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

      // --- DADOS ---
      // Header Row (Linha 6)
      const headerRow = ws.addRow(keys);
      headerRow.font = { bold: true, size: 9, color: { argb: WHITE } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });
      headerRow.height = 22;

      // Data Rows
      gData.forEach((rowItem, idx) => {
         const rowArray = keys.map(k => rowItem[k] ?? '');
         const r = ws.addRow(rowArray);
         r.eachCell(cell => {
             cell.font = { size: 8.5, color: { argb: 'FF3C3C3C' } };
             cell.alignment = { horizontal: 'center', vertical: 'middle' };
             if (idx % 2 === 1) {
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFF' } };
             }
         });
      });

      // Larguras de coluna
      keys.forEach((key, i) => {
        const col = ws.getColumn(i + 1);
        if (key === 'Data') col.width = 12;
        else if (key === 'Descrição' || key === 'Referência') col.width = 40;
        else if (key === 'Número O.S.') col.width = 20;
        else col.width = 16;
      });

      // Totals
      if (options.summaryData?.totalsRow && options.summaryData.totalsRow[group]) {
         ws.addRow([]); // Separador
         const totals = options.summaryData.totalsRow[group];
         const r = ws.addRow([totals[0]]);
         ws.mergeCells(r.number, 1, r.number, keys.length);
         r.font = { bold: true, color: { argb: WHITE } };
         r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_DARK } };
         r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }

    const finalFilename = generateFormattedFilename(options.title || 'Relatório OS', options.farmName || '', 'xlsx');
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    if ((window.navigator as any).msSaveOrOpenBlob) {
      (window.navigator as any).msSaveOrOpenBlob(blob, finalFilename);
    } else {
      await downloadFile(blob, finalFilename, 'xlsx');
    }
  }
};
