/**
 * useFazendaForm - Hook para gerenciar formulário de criação/edição de fazenda
 * 
 * Encapsula:
 * - Estado do formulário
 * - Carregamento de dados IBGE (estados/municípios)
 * - Validação e envio
 * - Mapeamento de Regiões
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../supabaseClient';
import { useAppContext } from '../../../context/AppContext';
import { U } from '../../../utils';
import { dbService } from '../../../services';
import { getREC } from '../utils/zarcUtils';

interface FazendaFormData {
  nome: string;
  tamanho_ha: string;
  cidade: string;
  estado: string;
  proprietario: string;
  latitude: number | null;
  longitude: number | null;
  microregiao: string;
  mesoregiao: string;
  regiao_imediata: string;
  rec_code: string;
  logo_base64: string;
}

const initialFormData: FazendaFormData = {
  nome: '',
  tamanho_ha: '',
  cidade: '',
  estado: '',
  proprietario: '',
  latitude: null,
  longitude: null,
  microregiao: '',
  mesoregiao: '',
  regiao_imediata: '',
  rec_code: '',
  logo_base64: ''
};

export function useFazendaForm() {
  const { session, setTela } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FazendaFormData>(initialFormData);
  
  // IBGE Data
  const [estados, setEstados] = useState<any[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  // Carregar Estados ao montar
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then(data => setEstados(data))
      .catch(err => console.error("Erro IBGE Estados:", err));
  }, []);

  // Carregar Municípios quando Estado muda
  useEffect(() => {
    if (!formData.estado) {
      setMunicipios([]);
      return;
    }
    setLoadingLoc(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.estado}/municipios`)
      .then(res => res.json())
      .then(data => setMunicipios(data))
      .catch(err => console.error("Erro IBGE Municipios:", err))
      .finally(() => setLoadingLoc(false));
  }, [formData.estado]);

  // Mapeamento REC por mesorregião (Lógica ZARC Detalhada)
  // Fonte: FazendaPerfilEditor.tsx
  
  // Selecionar Município
  const handleSelectMunicipio = (mId: string) => {
    const mun = municipios.find((m: any) => m.id.toString() === mId);
    if (!mun) return;

    const microName = mun?.microrregiao?.nome || '';
    const mesoName = mun?.microrregiao?.mesorregiao?.nome || '';
    const regiaoImediata = mun?.['regiao-imediata']?.nome || '';
    const recCode = getREC(mun);

    setFormData(prev => ({
      ...prev,
      cidade: mun.nome,
      microregiao: microName,
      mesoregiao: mesoName,
      regiao_imediata: regiaoImediata,
      rec_code: recCode
    }));
  };

  // Atualizar localização
  const handleLocationChange = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  // Atualizar logo
  const handleLogoChange = (base64: string) => {
    setFormData(prev => ({ ...prev, logo_base64: base64 }));
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (!session?.user?.id) return false;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('fazendas')
        .insert([{
          user_id: session.user.id,
          nome: formData.nome,
          tamanho_ha: Number(formData.tamanho_ha) || 0,
          cidade: formData.cidade,
          estado: formData.estado,
          proprietario: formData.proprietario || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          microregiao: formData.microregiao || null,
          mesoregiao: formData.mesoregiao || null,
          regiao_imediata: formData.regiao_imediata || null,
          rec_code: formData.rec_code || null,
          logo_base64: formData.logo_base64 || null,
          geojson: null
        }])
        .select()
        .single();

      // Adicionar criador como Proprietário na equipe
      await supabase.from('fazenda_membros').insert([{
        fazenda_id: data.id,
        user_id: session.user.id,
        role: 'Proprietário'
      }]);

      toast.success('Fazenda criada com sucesso!');
      setTela('fazenda_selection');
      return true;
    } catch (error: any) {
      const readableError = U.translateError(error.message);
      console.error('Erro ao criar fazenda:', readableError);
      toast.error('Erro ao criar fazenda: ' + readableError);
      return false;
    } finally {
      setLoading(false);
    }
  };


  const autofillLocation = async (lat: number, lng: number, stateSigla: string, cityName: string) => {
    setLoadingLoc(true);
    try {
        // 1. Buscar municipios do estado identificado (Manual fetch para evitar race condition)
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateSigla}/municipios`);
        const munData = await res.json();
        setMunicipios(munData); // Atualiza estado visual também

        // 2. Encontrar cidade
        const mun = munData.find((m: any) => m.nome === cityName);
        
        // 3. Preparar update
        let updates: Partial<FazendaFormData> = {
            latitude: lat,
            longitude: lng,
            estado: stateSigla,
            cidade: cityName // Nome visual
        };

        if (mun) {
            const microName = mun?.microrregiao?.nome || '';
            const mesoName = mun?.microrregiao?.mesorregiao?.nome || '';
            const regiaoImediata = mun?.['regiao-imediata']?.nome || '';
            const recCode = getREC(mun);

            updates = {
                ...updates,
                cidade: mun.nome, // Nome oficial do IBGE
                microregiao: microName,
                mesoregiao: mesoName,
                regiao_imediata: regiaoImediata,
                rec_code: recCode
            };
            toast.success(`Localização definida: ${mun.nome} - ${stateSigla}`);
        } else {
            toast.success(`Localização aproximiada: ${cityName} - ${stateSigla}`);
        }

        setFormData(prev => ({ ...prev, ...updates }));

    } catch (err) {
        console.error("Erro autofill location:", err);
        toast.error("Erro ao carregar dados da região.");
    } finally {
        setLoadingLoc(false);
    }
  };

  return {
    formData,
    setFormData,
    loading,
    estados,
    municipios,
    loadingLoc,
    handleSelectMunicipio,
    handleLocationChange,
    handleLogoChange,
    handleSubmit,
    autofillLocation // Exposto
  };
}
