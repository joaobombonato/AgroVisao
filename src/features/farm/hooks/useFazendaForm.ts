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

// Mapeamento de códigos REC por município
const REC_MAP: Record<string, string> = {
  '3170107': 'REC_05',  // Uberlândia
  '3106200': 'REC_04',  // Belo Horizonte
  '5208707': 'REC_07',  // Goiânia
  '5300108': 'REC_07',  // Brasília
  '3550308': 'REC_03',  // São Paulo
  '4106902': 'REC_06',  // Curitiba
  '5002704': 'REC_08',  // Campo Grande
  '5103403': 'REC_09',  // Cuiabá
  '1100205': 'REC_10',  // Porto Velho
  '1302603': 'REC_11',  // Manaus
  '2927408': 'REC_01',  // Salvador
  '2611606': 'REC_02',  // Recife
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

  // Obter código REC baseado no município
  const getREC = (municipio: any): string => {
    if (!municipio) return '';
    const municipioId = municipio.id?.toString();
    
    // Verificar mapa direto
    if (municipioId && REC_MAP[municipioId]) {
      return REC_MAP[municipioId];
    }
    
    // Fallback: buscar por região intermediária
    const regiaoInt = municipio?.['regiao-intermediaria']?.id?.toString().slice(0, 2);
    const regiaoMapping: Record<string, string> = {
      '31': 'REC_05', // MG
      '35': 'REC_03', // SP
      '41': 'REC_06', // PR
      '42': 'REC_06', // SC
      '43': 'REC_06', // RS
      '50': 'REC_08', // MS
      '51': 'REC_09', // MT
      '52': 'REC_07', // GO
      '53': 'REC_07', // DF
      '11': 'REC_10', // RO
      '12': 'REC_10', // AC
      '13': 'REC_11', // AM
      '14': 'REC_11', // RR
      '15': 'REC_11', // PA
      '16': 'REC_11', // AP
      '17': 'REC_07', // TO
      '21': 'REC_02', // MA
      '22': 'REC_02', // PI
      '23': 'REC_02', // CE
      '24': 'REC_02', // RN
      '25': 'REC_02', // PB
      '26': 'REC_02', // PE
      '27': 'REC_01', // AL
      '28': 'REC_01', // SE
      '29': 'REC_01', // BA
      '32': 'REC_04', // ES
      '33': 'REC_03', // RJ
    };
    
    return regiaoMapping[regiaoInt || ''] || 'REC_DEFAULT';
  };

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
    handleSubmit
  };
}
