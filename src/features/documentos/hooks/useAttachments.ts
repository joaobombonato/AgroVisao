import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { U } from '../../../utils';
import { exportAndUpload, downloadImage } from '../services/documentExporter';

export interface FileAttachment {
  id: string;
  type: 'upload' | 'camera' | 'generated';
  url: string; // URL pública ou Blob URL local se não enviado ainda? No código original já faz upload imediato.
  name: string;
  file?: File;
}

export function useAttachments() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [exportingDoc, setExportingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);
      
      try {
        const { storageService } = await import('../services/storage');
        const url = await storageService.uploadFile(file, 'documents');
        
        if (url) {
            setAttachments(prev => [...prev, {
                id: U.id('ATT-'),
                type: 'upload',
                url,
                name: file.name,
                file
            }]);
            toast.success("Arquivo anexado!");
        } else {
            toast.error("Erro ao enviar arquivo.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Falha no upload.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploading(false);
      }
    }
  };

  const addCameraAttachment = async (file: File) => {
    setUploading(true);
    try {
      const { storageService } = await import('../services/storage');
      const url = await storageService.uploadFile(file, 'documents');
      
      if (url) {
          setAttachments(prev => [...prev, {
              id: U.id('ATT-'),
              type: 'camera',
              url,
              name: file.name,
              file
          }]);
          toast.success("Foto anexada e dados extraídos!", { icon: '✅' });
      }
    } catch (err) {
      toast.error("Falha ao salvar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleExportDocument = async (previewElement: HTMLElement | null, docType: 'nfe' | 'boleto' | string) => {
    if (!previewElement) return;
    setExportingDoc(true);
    try {
      const docName = docType === 'nfe' ? 'DANFE' : 'Boleto';
      const url = await exportAndUpload(previewElement, docName);
      if (url) {
        setAttachments(prev => [...prev, {
            id: U.id('ATT-'),
            type: 'generated',
            url,
            name: `${docName}_${Date.now()}.jpg`
        }]);
        toast.success(`${docName} salvo como imagem e anexado! 📄`, { duration: 3000 });
      }
    } catch (err) {
      toast.error('Erro ao exportar documento.');
    } finally {
      setExportingDoc(false);
    }
  };

  const handleDownload = async (previewElement: HTMLElement | null, docType: 'nfe' | 'boleto' | string) => {
    if (!previewElement) return;
    const docName = docType === 'nfe' ? 'DANFE' : 'Boleto';
    await downloadImage(previewElement, docName);
    toast.success('Download iniciado!', { icon: '⬇️' });
  };

  const clearAttachments = () => setAttachments([]);

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  return {
    attachments,
    uploading,
    exportingDoc,
    fileInputRef,
    handleFileSelect,
    addCameraAttachment,
    handleExportDocument,
    handleDownload,
    clearAttachments,
    removeAttachment,
    setAttachments
  };
}
