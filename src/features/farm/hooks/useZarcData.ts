/**
 * useZarcData - Hook para consumir dados da API ZARC
 */
import { useState, useEffect } from 'react';
import { zarcService, ZarcRiskData } from '../../../services/zarcService';

export function useZarcData(municipio: string | null) {
  const [zarcData, setZarcData] = useState<ZarcRiskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!municipio) {
      setZarcData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await zarcService.getRiskData(municipio);
        setZarcData(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar dados ZARC');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [municipio]);

  return { zarcData, loading, error };
}
