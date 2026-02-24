import { toast } from 'react-hot-toast';
import type { OverlayType } from './mapHelpers';

interface GeoJSONData {
  geometry?: { coordinates: number[][][] };
  coordinates?: number[][][];
}

interface AvailableImage {
  date: string;
  cloudCover: number;
}

interface ExportPNGParams {
  currentOverlayUrl: string | null;
  geojsonData: GeoJSONData | null;
  overlayType: OverlayType;
  areaHectares: number | null;
  availableImages: AvailableImage[];
  selectedImageIndex: number;
  fazendaNome: string;
  setLoadingImages: (loading: boolean) => void;
}

/**
 * Exporta a análise de satélite como imagem PNG com cabeçalho e legenda.
 */
export const handleExportPNG = async ({
  currentOverlayUrl,
  geojsonData,
  overlayType,
  areaHectares,
  availableImages,
  selectedImageIndex,
  fazendaNome,
  setLoadingImages,
}: ExportPNGParams): Promise<void> => {
  if (!currentOverlayUrl || !geojsonData) {
    toast.error('Carregue uma imagem primeiro');
    return;
  }
  
  setLoadingImages(true);
  try {
    // 1. CARREGAR IMAGENS
    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

    const [satImg, logoImg, devImg] = await Promise.all([
      loadImage(currentOverlayUrl),
      loadImage('/logo-full.png'),
      loadImage('/logo-full-praticoapp.png')
    ]);
    
    // CONFIGURAÇÕES DO RELATÓRIO (Aumentadas para legibilidade e alta resolução)
    const headerHeight = 160;
    const footerHeight = 160;
    const padding = 60;
    const canvasWidth = satImg.width + (padding * 2);
    const canvasHeight = satImg.height + headerHeight + footerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 1. FUNDO TRANSPARENTE (Solicitado para uso versátil do usuário)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // 2. CABEÇALHO (LEGIBILIDADE AUMENTADA)
    const dateRaw = availableImages[selectedImageIndex]?.date || 'Data';
    const [year, month, day] = dateRaw.split('-');
    const dateBR = `${day}/${month}/${year}`;
    const dateFile = `${day}-${month}-${year}`;
    
    // Dados da Fazenda (Esquerda)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111827'; 
    ctx.font = 'bold 36px sans-serif'; 
    ctx.fillText(fazendaNome || 'Fazenda', padding, 70);
    
    const displayType = overlayType === 'truecolor' ? 'REAL' : overlayType.toUpperCase();
    
    ctx.font = '600 20px sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.fillText(`ANÁLISE: ${displayType}  |  IMAGEM: ${dateBR}`, padding, 110);
    
    ctx.font = 'normal 18px sans-serif';
    const areaText = areaHectares ? areaHectares.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
    ctx.fillText(`ÁREA MONITORADA: ${areaText} ha`, padding, 138);

    // Logo AgroVisão (Direita - Maior)
    const logoW = 240; 
    const logoH = (logoImg.height / logoImg.width) * logoW;
    ctx.drawImage(logoImg, canvasWidth - padding - logoW, 55, logoW, logoH);

    // 3. MAPA (RECORTE + FUNDO BRANCO PARA NUVENS)
    ctx.save();
    ctx.translate(padding, headerHeight);

    ctx.beginPath();
    const coords = geojsonData.geometry?.coordinates[0] || geojsonData.coordinates![0];
    const lngs = coords.map((c: number[]) => c[0]);
    const lats = coords.map((c: number[]) => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const wLng = maxLng - minLng;
    const hLat = maxLat - minLat;
    
    coords.forEach((c: number[], i: number) => {
      const x = ((c[0] - minLng) / wLng) * satImg.width;
      const y = (1 - (c[1] - minLat) / hLat) * satImg.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    
    // FUNDO BRANCO (Conforme nota técnica: representa nuvens/áreas sem dados)
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Clip e desenho da imagem do satélite
    ctx.save();
    ctx.clip();
    ctx.drawImage(satImg, 0, 0);
    ctx.restore();

    // Contorno Verde AgroVisão (Combina com o App)
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // 4. ASSINATURA PRÁTICO APP (CANTO DIREITO - MAIOR)
    const devW = 140; 
    const devH = (devImg.height / devImg.width) * devW;
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('DESENVOLVIDO POR:', canvasWidth - padding, canvasHeight - footerHeight - devH + 15);
    
    ctx.globalAlpha = 1.0;
    ctx.drawImage(devImg, canvasWidth - padding - devW, canvasHeight - footerHeight - devH + 35, devW, devH);

    // 5. RODAPÉ E LEGENDA (LEGIBILIDADE AUMENTADA)
    if (overlayType !== 'truecolor') {
      const legendW = 500;
      const legendH = 20;
      const legendX = (canvasWidth / 2) - (legendW / 2);
      const legendY = canvasHeight - 95;

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MENOR DENSIDADE', legendX, legendY - 15);
      
      ctx.textAlign = 'right';
      ctx.fillText('MAIOR DENSIDADE', legendX + legendW, legendY - 15);

      const grad = ctx.createLinearGradient(legendX, 0, legendX + legendW, 0);
      grad.addColorStop(0, '#8B4513');
      grad.addColorStop(0.2, '#CD4F39');
      grad.addColorStop(0.4, '#FFD700');
      grad.addColorStop(0.7, '#32CD32');
      grad.addColorStop(1, '#006400');
      
      ctx.fillStyle = grad;
      
      // Barra Arredondada (Conforme o App)
      if (ctx.roundRect) {
         ctx.beginPath();
         ctx.roundRect(legendX, legendY, legendW, legendH, legendH / 2);
         ctx.fill();
      } else {
         ctx.fillRect(legendX, legendY, legendW, legendH);
      }
      
      // Borda Suave
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(legendX, legendY, legendW, legendH, legendH / 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(legendX, legendY, legendW, legendH);
      }
    }
    
    // Nota Técnica e Watermark Final
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b7280';
    ctx.font = 'italic 14px sans-serif';
    ctx.fillText('Nota: Pontos brancos na propriedade representam cobertura de nuvens.', canvasWidth / 2, canvasHeight - 50);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Processamento Técnico via Sentinel-2 | AgroVisão', canvasWidth / 2, canvasHeight - 25);
    
    ctx.textAlign = 'left'; // Reset final

    // 4. DOWNLOAD INTELIGENTE
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const fileName = `AgroVisão ${displayType} ${dateFile} - ${fazendaNome || 'Fazenda'}.png`;

      try {
        if ('showSaveFilePicker' in window) {
          // @ts-ignore
          const h = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'PNG', accept: { 'image/png': ['.png'] } }] });
          const w = await h.createWritable();
          await w.write(blob);
          await w.close();
          return;
        }
        if (navigator.share) {
          await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })], title: fileName });
          return;
        }
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = fileName; a.click();
        setTimeout(() => URL.revokeObjectURL(u), 10000);
      } catch (err: any) {
         if (err.name !== 'AbortError') console.error(err);
      }
    }, 'image/png');
    
  } catch (e) {
    console.error(e);
    toast.error('Erro ao exportar');
  } finally {
    setLoadingImages(false);
  }
};
