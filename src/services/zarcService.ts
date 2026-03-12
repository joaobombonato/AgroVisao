import { supabase } from '../supabaseClient';

export interface ZarcRiskData {
  municipio: string;
  uf: string;
  cultura: string;
  grupo: string;
  solo: string;
  risco: string;
  [key: string]: any;
}

export const zarcService = {
  /**
   * Busca dados de risco ZARC para um município específico
   * @param municipio Nome do município (ex: "Sertãozinho")
   * @param resourceId ID do recurso (padrão Soja)
   */
  async getRiskData(municipio: string, resourceId?: string): Promise<ZarcRiskData[]> {
    if (!municipio) return [];

    try {
      // Usamos a Edge Function para evitar CORS em produção
      const { data, error } = await supabase.functions.invoke('zarc-proxy', {
        body: { municipio, resource_id: resourceId }
      });
      
      if (error) {
        console.warn("ZARC Proxy Error:", error);
        return [];
      }

      if (data && data.success && data.result.records) {
        return data.result.records;
      }

      return [];
    } catch (error) {
      console.error("ZARC Service Exception:", error);
      return [];
    }
  }
};
