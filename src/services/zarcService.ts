/**
 * zarcService.ts - Serviço para integração com a API ZARC (Portal de Dados Abertos MAPA)
 * 
 * Utiliza o endpoint datastore_search do CKAN para buscar riscos por município.
 */

// Em desenvolvimento utilizamos o proxy do Vite para evitar CORS
// Em produção, isso precisará ser um endpoint real ou uma Edge Function
const BASE_URL = window.location.hostname === 'localhost' ? '/api-proxy-zarc' : 'https://dados.agricultura.gov.br/api/3/action/datastore_search';
const SOJA_RESOURCE_ID = '97038867-7afc-4f93-85ef-f39cf8368581';

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
  async getRiskData(municipio: string, resourceId: string = SOJA_RESOURCE_ID): Promise<ZarcRiskData[]> {
    if (!municipio) return [];

    try {
      // Filtros em formato JSON stringificado
      const filters = JSON.stringify({ municipio });
      const url = `${BASE_URL}?resource_id=${resourceId}&filters=${encodeURIComponent(filters)}&limit=10`;

      const response = await fetch(url);
      
      if (!response.ok) return [];

      // Tenta processar o JSON silenciosamente
      try {
        const data = await response.json();
        if (data.success && data.result.records) {
          return data.result.records;
        }
      } catch (e) {
        // Se falhar (ex: retornou o HTML do app por erro de proxy local), 
        // falhamos silenciosamente para usar o fallback robusto do getREC.
        return [];
      }

      return [];
    } catch (error) {
      // Falha silenciosa em desenvolvimento local
      return [];
    }
  }
};
