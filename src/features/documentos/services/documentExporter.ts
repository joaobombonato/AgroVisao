/**
 * documentExporter.ts — Exporta componentes HTML como imagens JPG
 * 
 * Usa html2canvas para capturar o conteúdo do componente
 * e depois faz upload para o Supabase Storage
 */
import html2canvas from 'html2canvas';

/**
 * Captura um elemento DOM como File (JPG)
 */
export async function captureAsImage(element: HTMLElement, filename: string = 'documento'): Promise<File> {
  const canvas = await html2canvas(element, {
    scale: 2, // Alta resolução
    useCORS: true,
    backgroundColor: '#FFFFFF',
    logging: false,
  });
  
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92);
  });
  
  return new File([blob], `${filename}_${Date.now()}.jpg`, { type: 'image/jpeg' });
}

/**
 * Captura e faz upload para Supabase Storage
 */
export async function exportAndUpload(element: HTMLElement, docName: string): Promise<string | null> {
  try {
    const file = await captureAsImage(element, docName);
    const { storageService } = await import('./storage');
    return await storageService.uploadFile(file, 'documents', 'gerados');
  } catch (err) {
    console.error('[DocumentExporter] Erro:', err);
    return null;
  }
}

/**
 * Baixa o elemento como imagem diretamente no dispositivo
 */
export async function downloadImage(element: HTMLElement, filename: string): Promise<boolean> {
  try {
    const file = await captureAsImage(element, filename);
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('[DocumentExporter] Erro ao baixar:', err);
    return false;
  }
}
