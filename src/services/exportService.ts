import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  
  if (ext === 'pdf') {
    // PDF com nome amigável e espaçado
    return `AgroVisão ${cleanTitle} ${dateStr} - ${cleanFarm}.${ext}`;
  } else {
    // Excel mantém padrão mais seguro sem caractéres pt-br
    const safeTitle = sanitizeFilename(title);
    const safeFarm = sanitizeFilename(farmName || 'Fazenda');
    return `AgroVisao_${safeTitle}_${now.toISOString().split('T')[0]}_${safeFarm}.${ext}`;
  }
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
        doc.addImage(logo, 'PNG', 16, 10, 28, 14); // Y de 5 para 10
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
      margin: { top: 40, bottom: 20 },
      didDrawPage: (dataPI: any) => {
        const pageHeight = doc.internal.pageSize.height;
        
        // Linha do rodapé
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.5);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        // Rodapé Esq (Autoria e Versão)
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`AgroVisão ${APP_VERSION} — Solução PráticoApp`, 14, pageHeight - 10);

        // Rodapé Centro (Paginação)
        const current = dataPI.pageNumber;
        doc.text(`Página ${current}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Rodapé Dir (Logo PráticoApp)
        try {
          doc.addImage(PRATICO_LOGO_B64, 'PNG', pageWidth - 34, pageHeight - 14, 20, 5);
        } catch (e) {
          doc.text('PráticoApp', pageWidth - 14, pageHeight - 10, { align: 'right' });
        }
      }
    };

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

    // 3. Download direto via jsPDF
    const finalFilename = generateFormattedFilename(title, farmName || '', 'pdf');
    doc.save(finalFilename);
  },

  /**
   * Exporta dados para Excel (.xlsx)
   */
  exportToExcel: (data: any[], options: ExportOptions) => {
    const { title, farmName } = options;
    
    // Converte array de objetos ou arrays para Worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Cria Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    
    // Download direto via XLSX
    const finalFilename = generateFormattedFilename(title, farmName || '', 'xlsx');
    XLSX.writeFile(wb, finalFilename);
  }
};
