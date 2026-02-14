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
  // Prepara inputs: html2canvas as vezes falha com inputs controlados por React. 
  // Vamos forçar o atributo 'value' no DOM e adicionar classe de impressão.
  const originalClass = element.className;
  element.classList.add('printing');
  
  // Forçar valores nos inputs para o atributo value (para html2canvas ler)
  const inputs = element.querySelectorAll('input');
  inputs.forEach((input: any) => {
    input.setAttribute('value', input.value);
  });

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Reduzido de 2.5 para 2 (qualidade suficiente e menos distorção)
      useCORS: true,
      backgroundColor: '#FFFFFF', // Fundo branco garantido
      logging: false,
      onclone: (clonedDoc) => {
          // Garante que o clone também tenha a classe e valores
          const clonedElement = clonedDoc.querySelector(`[data-html2canvas-ignore="true"]`);
          if(clonedElement) clonedElement.remove(); // Remove botões explicitamente ignorados
      }
    });
    
    // PNG para qualidade lossless (solicitado: 'exatamente o que vemos')
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    
    // Se o filename já tiver extensão, usa. Senão adiciona.
    const finalName = filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`;
    
    return new File([blob], finalName, { type: 'image/png' });
  } finally {
    // Restaura estado original
    element.className = originalClass;
    element.classList.remove('printing');
  }
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
/**
 * Baixa o elemento como imagem diretamente no dispositivo
 * Tenta usar Web Share API (Mobile) primeiro, fallback para Download Link (Desktop)
 */
export async function downloadImage(element: HTMLElement, filename: string): Promise<boolean> {
  try {
    const file = await captureAsImage(element, filename);

    // Tentativa 1: Web Share API (Melhor para Mobile - iOS/Android)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: 'Documento gerado pelo VisãoAgro',
        });
        return true;
      } catch (shareError) {
        if ((shareError as any).name !== 'AbortError') {
          console.warn('[DocumentExporter] Share API falhou, tentando download legacy...', shareError);
        } else {
            return false; // Usuário cancelou
        }
      }
    }

    // Tentativa 2: Link Download Tradicional (Desktop / Fallback)
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    
    // Limpeza
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (err) {
    console.error('[DocumentExporter] Erro ao baixar/compartilhar:', err);
    return false;
  }
}
