import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { U } from '../utils';
import { APP_VERSION } from '../constants';
import { PRATICO_LOGO_B64 } from '../assets/praticoBase64';
import { AGROVISAO_LOGO_B64 } from '../assets/agrovisaoBase64';

interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  logo?: string; // Base64
  farmName?: string;
  columnStyles?: any; // Configurações de coluna como larguras especificas
  // Dados de resumo para o rodapé do relatório
  summaryData?: {
    totalsRow?: any[]; // Linha de totais (mesma quantidade de colunas)
    machineSummary?: { maquina: string; litros: number; custo: number; horasKm: number; isKM: boolean }[];
  };
}

const sanitizeFilename = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
};

const generateFormattedFilename = (title: string, farmName: string, ext: string) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  
  const cleanTitle = title.toUpperCase();
  const cleanFarm = farmName || 'Fazenda';
  
  // Mesmo formato amigável para PDF e Excel
  return `AgroVisão ${cleanTitle} ${dateStr} - ${cleanFarm}.${ext}`;
};

export const exportService = {
  /**
   * Exporta dados para PDF usando jsPDF e jspdf-autotable
   */
  exportToPDF: async (columns: string[], data: any[][], options: ExportOptions) => {
    const doc = new jsPDF('l', 'mm', 'a4') as any; // 'l' para paisagem (landscape) já que tem muitas colunas
    const { title, subtitle, logo, farmName } = options;
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const pageWidth = doc.internal.pageSize.width;

    // Fundo cinza claro para o cabeçalho (Preenchimento total ponta a ponta)
    doc.setFillColor(248, 249, 250); // Gray 50
    doc.rect(0, 0, pageWidth, 33, 'F'); // Aumentado rect height para conter a descida

    // Logo da Propriedade no Topo Esquerdo
    if (logo) {
      try {
        const imgProps = doc.getImageProperties(logo);
        const ratio = imgProps.width / imgProps.height;
        
        // Tamanho do card preferido pelo usuário (v4.7.56/58)
        const rectX = 15;
        const rectY = 9;
        const rectW = 30;
        const rectH = 16;

        // Área útil: Adicionada margem de 1mm (0.5mm cada lado) para evitar 
        // que os cantos quadrados da imagem "vazem" sobre a borda arredondada do card.
        const maxLogoW = rectW - 0.2; 
        const maxLogoH = rectH - 0.2;
        
        let imgW = maxLogoW;
        let imgH = imgW / ratio;
        
        if (imgH > maxLogoH) {
          imgH = maxLogoH;
          imgW = imgH * ratio;
        }

        // Centralização exata dentro do card branco
        const xPos = rectX + (rectW - imgW) / 2;
        const yPos = rectY + (rectH - imgH) / 2;
        
        // Desenha o card branco arredondado
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(225, 225, 225); 
        doc.roundedRect(rectX, rectY, rectW, rectH, 2, 2, 'FD'); 

        // Tenta detectar se é JPEG ou PNG do base64 para evitar avisos
        const format = logo.includes('image/jpeg') ? 'JPEG' : 'PNG';
        
        doc.addImage(logo, format, xPos, yPos, imgW, imgH);
      } catch (e) {
        console.warn('Falha ao adicionar logotipo do usuario ao PDF:', e);
      }
    }

    // 1. Cabeçalho Rico (Alinhado à esquerda após a logo)
    const startX = 48; // Para dar espaço para a logo do lado esquerdo e margem do retangulo
    const tituloMaiusculo = title.toUpperCase();
    
    // Título Principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(tituloMaiusculo, startX, 15, { align: 'left' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.text(`Propriedade: ${farmName || 'Fazenda'}`, startX, 21, { align: 'left' });
    
    if (subtitle) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(63, 81, 181); // Indigo color for subtitle (Período)
      doc.text(subtitle, startX, 26, { align: 'left' });
    }

    // Top Right: Date & Time
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${dateStr} ${timeStr}`, pageWidth - 16, 11, { align: 'right' }); 

    // Top Right: Logo AgroVisão (Abaixo da Data e Hora)
    try {
      // Proporção ajustada visualmente (largura maior p/ evitar aspecto comprimido)
      doc.addImage(AGROVISAO_LOGO_B64, 'PNG', pageWidth - 56, 12.5, 42, 11.5);
    } catch (e) {
      console.warn('Falha ao adicionar logotipo AgroVisao ao PDF:', e);
    }

    // Linha principal Indigo (com as margens originais 14px como o usuário pediu)
    doc.setDrawColor(63, 81, 181); 
    doc.setLineWidth(1.5);
    doc.line(14, 33, pageWidth - 14, 33); 

    // Linha de Sombreado abaixo da principal (Cinza bem claro, acompanhando a margem de 14px)
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(1.0);
    doc.line(14, 34, pageWidth - 14, 34); 

    const tableOptions = {
      head: [columns],
      body: data,
      startY: 40,
      theme: 'striped' as const,
      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        textColor: [60, 60, 60] as [number, number, number],
        halign: 'center' as const // Itens centralizados
      },
      columnStyles: options.columnStyles, // Larguras e estilos injetados conforme o relatorio
      headStyles: { 
        fillColor: [63, 81, 181] as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold' as const,
        halign: 'center' as const
      },
      alternateRowStyles: {
        fillColor: [249, 250, 255] as [number, number, number]
      },
      margin: { top: 40, bottom: 20 }
    };

    // 3. Renderiza a tabela principal
    // Chamada ultra-robusta ao autoTable, suportando diferentes formas como o Vite/Rollup embute o módulo
    if (typeof autoTable === 'function') {
      autoTable(doc, tableOptions);
    } else if (autoTable && typeof (autoTable as any).default === 'function') {
      (autoTable as any).default(doc, tableOptions);
    } else if (typeof (doc as any).autoTable === 'function') {
      (doc as any).autoTable(tableOptions);
    } else {
      console.error('jspdf-autotable não está carregado corretamente.');
      throw new Error('Função autoTable não encontrada no escopo.');
    }

    // 4. Seção de Resumo (Totais + Por Máquina)
    if (options.summaryData) {
      const { totalsRow, machineSummary } = options.summaryData;
      let cursorY = (doc as any).lastAutoTable?.finalY || 40;

      // === LINHA DE TOTAIS ===
      if (totalsRow && totalsRow.length > 0) {
        cursorY += 2;

        const totalsTableOptions = {
          head: [] as any[],
          body: [totalsRow],
          startY: cursorY,
          theme: 'plain' as const,
          styles: {
            fontSize: 8,
            cellPadding: 3,
            textColor: [255, 255, 255] as [number, number, number],
            fillColor: [40, 53, 147] as [number, number, number], // Indigo escuro
            fontStyle: 'bold' as const,
            halign: 'center' as const
          },
          columnStyles: options.columnStyles,
          margin: { left: 14, right: 14 }
        };

        if (typeof autoTable === 'function') {
          autoTable(doc, totalsTableOptions);
        } else if (autoTable && typeof (autoTable as any).default === 'function') {
          (autoTable as any).default(doc, totalsTableOptions);
        } else if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(totalsTableOptions);
        }

        cursorY = (doc as any).lastAutoTable?.finalY || cursorY + 10;
      }

      // === RESUMO POR MÁQUINA ===
      if (machineSummary && machineSummary.length > 0) {
        cursorY += 8;

        // Verifica se cabe na página, senão adiciona nova
        const pageHeight = doc.internal.pageSize.height;
        const spaceNeeded = 20 + (machineSummary.length * 8);
        if (cursorY + spaceNeeded > pageHeight - 25) {
          doc.addPage();
          cursorY = 20;
        }

        // Título da seção
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(40, 53, 147);
        doc.text('RESUMO POR MÁQUINA NO PERÍODO', 14, cursorY);
        cursorY += 2;

        // Linha decorativa abaixo do título
        doc.setDrawColor(63, 81, 181);
        doc.setLineWidth(0.8);
        doc.line(14, cursorY, pageWidth - 14, cursorY);
        cursorY += 2;

        // Tabela de resumo por máquina
        const machineColumns = ['Máquina', 'Total Litros', 'KM/Hrs no Período', 'Total Custo R$', '% do Total'];
        const totalLitrosGeral = machineSummary.reduce((s, m) => s + m.litros, 0);
        
        const machineData = machineSummary.map(m => [
          m.maquina,
          `${U.formatHorimetro(m.litros)} L`,
          m.horasKm > 0 ? `${U.formatHorimetro(m.horasKm)} ${m.isKM ? 'KM' : 'Hrs'}` : '-',
          `R$ ${U.formatValue(m.custo)}`,
          `${totalLitrosGeral > 0 ? ((m.litros / totalLitrosGeral) * 100).toFixed(1) : '0.0'}%`
        ]);

        const machineTableOptions = {
          head: [machineColumns],
          body: machineData,
          startY: cursorY,
          theme: 'striped' as const,
          styles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            textColor: [60, 60, 60] as [number, number, number],
            halign: 'center' as const
          },
          headStyles: {
            fillColor: [55, 71, 133] as [number, number, number],
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold' as const,
            halign: 'center' as const
          },
          columnStyles: {
            0: { halign: 'left' as const, cellWidth: 100 },
          },
          alternateRowStyles: {
            fillColor: [240, 242, 255] as [number, number, number]
          },
          margin: { left: 14, right: 14 }
        };

        if (typeof autoTable === 'function') {
          autoTable(doc, machineTableOptions);
        } else if (autoTable && typeof (autoTable as any).default === 'function') {
          (autoTable as any).default(doc, machineTableOptions);
        } else if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(machineTableOptions);
        }
      }
    }

    // 5. Rodapé em TODAS as páginas (pós-processamento)
    // Isso garante que as páginas de resumo também recebam o rodapé correto
    const totalPages = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Linha do rodapé
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

      // Rodapé Esq (Autoria e Versão)
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`AgroVisão ${APP_VERSION} — Solução PráticoApp`, 14, pageHeight - 10);

      // Rodapé Centro (Paginação X - Y)
      doc.text(`Página ${i} - ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Rodapé Dir (Logo PráticoApp)
      try {
        doc.addImage(PRATICO_LOGO_B64, 'PNG', pageWidth - 34, pageHeight - 14, 20, 5);
      } catch (e) {
        doc.text('PráticoApp', pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
    }

    // 6. Download direto via jsPDF
    const finalFilename = generateFormattedFilename(title, farmName || '', 'pdf');
    doc.save(finalFilename);
  },

  /**
   * Exporta dados para Excel (.xlsx) com resumo integrado
   */
  exportToExcel: async (data: any[], options: ExportOptions) => {
    const { title, farmName, subtitle, summaryData } = options;
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'AgroVisão';
    wb.created = now;

    // Cor padrão Indigo
    const INDIGO = 'FF3F51B5';
    const INDIGO_DARK = 'FF283593';
    const GRAY_LIGHT = 'FFF8F9FA';
    const WHITE = 'FFFFFFFF';

    // ========== ABA 1: DADOS ==========
    const ws = wb.addWorksheet('Dados', {
      properties: { defaultColWidth: 14 }
    });

    // --- CABEÇALHO ---
    // Linha 1: Título
    const titleRow = ws.addRow([title.toUpperCase()]);
    titleRow.font = { bold: true, size: 16, color: { argb: INDIGO_DARK } };
    titleRow.height = 28;

    // Linha 2: Propriedade
    const farmRow = ws.addRow([`Propriedade: ${farmName || 'Fazenda'}`]);
    farmRow.font = { size: 10, color: { argb: 'FF6E6E6E' } };

    // Linha 3: Período
    const periodRow = ws.addRow([subtitle || '']);
    periodRow.font = { bold: true, size: 10, color: { argb: INDIGO } };

    // Linha 4: Geração
    const genRow = ws.addRow([`Gerado em: ${dateStr} ${timeStr} — AgroVisão ${APP_VERSION}`]);
    genRow.font = { size: 8, color: { argb: 'FF999999' }, italic: true };

    // Linha 5: Separador
    ws.addRow([]);

    // --- DADOS ---
    if (data.length > 0) {
      const keys = Object.keys(data[0]);

      // Cabeçalho das colunas (Linha 6)
      const headerRow = ws.addRow(keys);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } };
        cell.font = { bold: true, size: 9, color: { argb: WHITE } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });
      headerRow.height = 22;

      // Linhas de dados
      data.forEach((row, idx) => {
        const dataRow = ws.addRow(keys.map(k => row[k]));
        dataRow.eachCell((cell) => {
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
        if (key.includes('Máquina')) col.width = 50;
        else if (key === 'Data') col.width = 12;
        else if (key === 'Custo R$') col.width = 16;
        else col.width = 15;
      });
    }

    // --- LINHA DE TOTAIS ---
    if (summaryData?.totalsRow && summaryData.totalsRow.length > 0 && data.length > 0) {
      ws.addRow([]); // Separador

      const keys = Object.keys(data[0]);
      const totalsValues = keys.map(key => {
        if (key === 'Data') return summaryData.totalsRow![0] || '';
        if (key.includes('Máquina')) return 'TOTAIS';
        if (key === 'Litros') return summaryData.totalsRow![5] || '';
        if (key === 'Custo R$') return summaryData.totalsRow![9] || '';
        return '';
      });

      const totRow = ws.addRow(totalsValues);
      totRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_DARK } };
        cell.font = { bold: true, size: 9, color: { argb: WHITE } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      totRow.height = 22;
    }

    // ========== ABA 2: RESUMO POR MÁQUINA ==========
    if (summaryData?.machineSummary && summaryData.machineSummary.length > 0) {
      const wsResumo = wb.addWorksheet('Resumo por Máquina');
      const totalLitrosGeral = summaryData.machineSummary.reduce((s, m) => s + m.litros, 0);

      // Título
      const tRow = wsResumo.addRow(['RESUMO POR MÁQUINA NO PERÍODO']);
      tRow.font = { bold: true, size: 14, color: { argb: INDIGO_DARK } };
      tRow.height = 26;

      const pRow = wsResumo.addRow([subtitle || '']);
      pRow.font = { bold: true, size: 10, color: { argb: INDIGO } };

      wsResumo.addRow([]); // Separador

      // Cabeçalho
      const machHeaders = ['Máquina', 'Total Litros', 'KM/Hrs no Período', 'Total Custo R$', '% do Total'];
      const mHeaderRow = wsResumo.addRow(machHeaders);
      mHeaderRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374785' } };
        cell.font = { bold: true, size: 9, color: { argb: WHITE } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      mHeaderRow.height = 22;

      // Dados das máquinas
      summaryData.machineSummary.forEach((m, idx) => {
        const row = wsResumo.addRow([
          m.maquina,
          `${U.formatHorimetro(m.litros)} L`,
          m.horasKm > 0 ? `${U.formatHorimetro(m.horasKm)} ${m.isKM ? 'KM' : 'Hrs'}` : '-',
          `R$ ${U.formatValue(m.custo)}`,
          `${totalLitrosGeral > 0 ? ((m.litros / totalLitrosGeral) * 100).toFixed(1) : '0.0'}%`
        ]);
        row.eachCell((cell, colNumber) => {
          cell.font = { size: 9, color: { argb: 'FF3C3C3C' } };
          cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center', vertical: 'middle' };
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F2FF' } };
          }
        });
      });

      // Larguras
      wsResumo.getColumn(1).width = 55;
      wsResumo.getColumn(2).width = 16;
      wsResumo.getColumn(3).width = 22;
      wsResumo.getColumn(4).width = 18;
      wsResumo.getColumn(5).width = 14;
    }

    // ========== DOWNLOAD ==========
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateFormattedFilename(title, farmName || '', 'xlsx');
    link.click();
    URL.revokeObjectURL(url);
  }
};
