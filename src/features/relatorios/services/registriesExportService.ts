import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { APP_VERSION } from '../../../constants';
import { downloadFile } from '../../../utils/downloadFile';
import { AGROVISAO_LOGO_B64 } from '../../../assets/agrovisaoBase64';
import { PRATICO_LOGO_B64 } from '../../../assets/praticoBase64';

export interface RegistriesExportOptions {
  title: string;
  filename: string;
  farmName: string;
  subtitle: string;
  logo: string;
  selectedColumns?: string[];
}

const drawPDFHeader = (doc: any, options: RegistriesExportOptions, pageWidth: number) => {
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

export const registriesExportService = {
  exportToPDF: async (
    columnsMap: Record<string, string[]>,
    dataMap: Record<string, any[][]>,
    options: RegistriesExportOptions
  ) => {
    const doc = new jsPDF('l', 'mm', 'a4') as any;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    let startY = 40;
    
    // Initial header rendering
    drawPDFHeader(doc, options, pageWidth);

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
      doc.setTextColor(245, 158, 11); // Amber for Section Title

      doc.text(categoryKey, 14, startY);
      startY += 6;

      const tableOptions: any = {
        startY,
        head: [cols],
        body: data,
        theme: 'striped',
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [60, 60, 60],
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 255]
        },
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        didDrawPage: (dataInfo: any) => {
          if (dataInfo.pageNumber > 1 && dataInfo.cursor.y === dataInfo.settings.margin.top) {
             drawPDFHeader(doc, options, pageWidth);
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
        
        // Linha do rodapé
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.5);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Relatório gerado pelo sistema AgroVisão - v${APP_VERSION} — Solução PráticoApp`, 14, pageHeight - 10);
        try {
          doc.addImage(PRATICO_LOGO_B64, 'PNG', pageWidth - 30, pageHeight - 12, 16, 7);
        } catch(e){}
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
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
