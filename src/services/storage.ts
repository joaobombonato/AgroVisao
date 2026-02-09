import { supabase } from '../supabaseClient';

/**
 * Serviço de Armazenamento (Storage)
 * Gerencia uploads para o Supabase Storage
 */
export const storageService = {
  /**
   * Faz upload de um arquivo para o bucket especificado.
   * @param file Arquivo (File object)
   * @param bucket Nome do bucket (ex: 'documents', 'images', 'avatars')
   * @param folder Pasta opcional dentro do bucket
   * @returns URL pública do arquivo ou null em caso de erro
   */
  async uploadFile(file: File, bucket: string = 'documents', folder: string = 'uploads'): Promise<string | null> {
    try {
      // Normaliza nome do arquivo para evitar caracteres especiais
      const fileExt = file.name.split('.').pop();
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${folder}/${new Date().toISOString().split('T')[0]}_${Math.random().toString(36).substring(7)}_${cleanName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

      if (error) {
        console.error('Erro no upload Supabase:', error);
        throw error;
      }

      // Gera URL pública
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Storage Service Error:', error);
      return null;
    }
  }
};
