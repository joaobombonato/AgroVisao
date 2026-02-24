export const downloadFile = async (blob: Blob, fileName: string, fileExtension: 'pdf' | 'xlsx' | 'png') => {
  const typesMap = {
    pdf: { description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } },
    xlsx: { description: 'Excel Document', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } },
    png: { description: 'PNG Image', accept: { 'image/png': ['.png'] } },
  };

  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [typesMap[fileExtension]],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Erro no showSaveFilePicker:', err);
    }
    if (err.name === 'AbortError') {
      return false; // Usuário cancelou o prompt
    }
  }

  // Fallback (Navegadores legados ou ambientes sem suporte ao File System Access API)
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
  
  return true;
};
