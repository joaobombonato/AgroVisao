import React, { useState, Suspense, useEffect } from 'react';
import { Building2, Ruler, MapPin, Check, ChevronLeft, Loader2, Search, Map } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';

// Lazy load the map component to avoid SSR issues
const FarmMap = React.lazy(() => import('../components/maps/FarmMap'));

// Import geocoding function
import { geocodeAddress } from '../components/maps/FarmMap';

export default function CreateFazendaScreen() {
  const { session, setTela } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  // IBGE Data
  const [estados, setEstados] = useState<any[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    tamanho_ha: '',
    cidade: '',
    estado: '',
    proprietario: '',
    latitude: null as number | null,
    longitude: null as number | null,
    microregiao: '',
    mesoregiao: '',
    regiao_imediata: '',
    rec_code: ''
  });

  // Load Estados on Mount
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then(data => setEstados(data))
      .catch(err => console.error("Erro IBGE Estados:", err));
  }, []);

  // Load Municipios when Estado changes
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

  // Handle geocoding when user clicks "Buscar no Mapa"
  const handleGeocode = async () => {
    if (!formData.cidade || !formData.estado) {
      toast.error('Preencha cidade e estado primeiro');
      return;
    }

    setGeocoding(true);
    const address = `${formData.cidade}, ${formData.estado}, Brasil`;
    
    try {
      const result = await geocodeAddress(address);
      if (result) {
        setFormData(prev => ({
          ...prev,
          latitude: result.lat,
          longitude: result.lng
        }));
        setShowMap(true);
        toast.success('Localização encontrada! Ajuste no mapa se necessário.');
      } else {
        toast.error('Localização não encontrada. Tente clicar manualmente no mapa.');
        setShowMap(true);
      }
    } catch (error) {
      toast.error('Erro ao buscar localização');
      setShowMap(true);
    } finally {
      setGeocoding(false);
    }
  };

  // Handle location change from map click
  const handleLocationChange = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
        toast.error("Geolocalização não suportada no seu navegador.");
        return;
    }

    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            setFormData(prev => ({ ...prev, latitude, longitude }));
            setShowMap(true);
            setGeocoding(false);
            toast.success("Localização atual capturada!");
        },
        (err) => {
            console.error(err);
            toast.error("Não foi possível obter sua localização.");
            setGeocoding(false);
        },
        { enableHighAccuracy: true }
    );
  };

  const getREC = (municipio: any) => {
    // Cobertura Nacional de RECs (Região Edafoclimática - Embrapa Soja)
    // Mapeamento baseado no cruzamento de Mesorregiões IBGE e MRS (Macrorregiões Sojícolas)
    const uf = municipio['microrregiao']?.['mesorregiao']?.['UF']?.sigla;
    const mesoId = String(municipio['microrregiao']?.['mesorregiao']?.id);
    
    // MINAS GERAIS & GOIÁS (Macro 3)
    if (uf === 'MG') {
        if (mesoId === '3101') return 'M3 - 304'; // Noroeste (Paracatu/Unaí)
        if (mesoId === '3105') return 'M3 - 301'; // Triângulo/Alto Paranaíba
        if (mesoId === '3102') return 'M3 - 303'; // Norte
    }
    if (uf === 'GO') {
        if (['5204', '5205'].includes(mesoId)) return 'M3 - 301'; // Sudoeste/Sul Goiano
        if (['5201', '5202', '5203'].includes(mesoId)) return 'M3 - 302'; // Norte/Centro
    }

    // MATO GROSSO (Macros 3 e 4)
    if (uf === 'MT') {
        if (mesoId === '5101' || mesoId === '5102') return 'M4 - 401'; // Norte/Médio-Norte
        if (mesoId === '5105') return 'M3 - 304'; // Sudeste MT
        if (mesoId === '5104') return 'M4 - 402'; // Sudoeste MT
    }

    // MATO GROSSO DO SUL & PARANÁ (Macro 2)
    if (uf === 'MS') {
        if (mesoId === '5001') return 'M3 - 302'; // Centro-Norte
        if (['5004', '5003'].includes(mesoId)) return 'M2 - 204'; // Sudoeste
    }
    if (uf === 'PR') {
        if (['4101', '4102', '4106'].includes(mesoId)) return 'M2 - 201'; // Norte/Noroeste
        if (['4103', '4105'].includes(mesoId)) return 'M2 - 202'; // Oeste/Centro-Ocidental
    }

    // MATOPIBA (Macro 5)
    if (['BA', 'PI', 'MA', 'TO'].includes(uf)) {
        return 'M5 - 501'; // Cerrado Norte (Simplificado)
    }

    // RIO GRANDE DO SUL (Macro 1)
    if (uf === 'RS') {
        if (['4301', '4302'].includes(mesoId)) return 'M1 - 102'; // Noroeste/Nordeste
        if (mesoId === '4305') return 'M1 - 101'; // Sudeste
    }

    return '';
  };

  const handleSelectMunicipio = (mId: string) => {
    const mun = municipios.find(m => String(m.id) === mId);
    if (mun) {
        const rec = getREC(mun);
        setFormData(prev => ({
            ...prev,
            cidade: mun.nome,
            // Captura Regiões do IBGE (embrapa/gestão regional)
            microregiao: mun['microrregiao']?.nome || '',
            mesoregiao: mun['microrregiao']?.['mesorregiao']?.nome || '',
            regiao_imediata: mun['regiao-imediata']?.nome || '',
            rec_code: rec
        }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    setLoading(true);

    try {
       // Cria registro na tabela 'fazendas' com geolocalização e microregião
       const { data, error } = await supabase
        .from('fazendas')
        .insert([
            {
                user_id: session.user.id,
                nome: formData.nome,
                tamanho_ha: Number(formData.tamanho_ha) || 0,
                cidade: formData.cidade,
                estado: formData.estado,
                proprietario: formData.proprietario,
                latitude: formData.latitude,
                longitude: formData.longitude,
                created_at: new Date(),
                // Configuração inicial padrão com dados regionais
                config: {
                    parametros: {},
                    menuOrder: [],
                    regional: {
                        microregiao: formData.microregiao,
                        mesoregiao: formData.mesoregiao,
                        regiao_imediata: formData.regiao_imediata,
                        rec: formData.rec_code
                    }
                }
            }
        ])
        .select();

       if (error) throw error;
       
       const novaFazenda = data[0];

       // 2. Inserir o criador como Proprietário na equipe
       await supabase
        .from('fazenda_membros')
        .insert([{
            fazenda_id: novaFazenda.id,
            user_id: session.user.id,
            role: 'Proprietário'
        }]);

       toast.success("Propriedade cadastrada! Agora ajuste as configurações.");
       setTela('fazenda_selection'); // Volta para seleção para ver a nova fazenda

    } catch (error: any) {
        toast.error("Erro ao criar fazenda: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="w-full max-w-lg py-6">
        
        <button 
            onClick={() => setTela('fazenda_selection')}
            className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium transition-colors"
        >
            <ChevronLeft className="w-5 h-5" /> Voltar
        </button>

        <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Nova Propriedade</h1>
            <p className="text-gray-500 text-sm">Cadastre os dados básicos da sua fazenda para começar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-4">
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Fazenda</label>
                     <div className="relative">
                        <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            required
                            placeholder="Ex: Fazenda Santa Cruz"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            value={formData.nome}
                            onChange={e => setFormData({...formData, nome: e.target.value})}
                        />
                     </div>
                </div>

                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Área Total (Hectares)</label>
                     <div className="relative">
                        <Ruler className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                            type="number" 
                            placeholder="Ex: 1500"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            value={formData.tamanho_ha}
                            onChange={e => setFormData({...formData, tamanho_ha: e.target.value})}
                        />
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
                        <select 
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            value={formData.estado}
                            onChange={e => setFormData({...formData, estado: e.target.value, cidade: ''})}
                            required
                        >
                            <option value="">Selecione...</option>
                            {estados.map(est => (
                                <option key={est.id} value={est.sigla}>{est.nome} ({est.sigla})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <select 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all disabled:opacity-50"
                                value={municipios.find(m => m.nome === formData.cidade)?.id || ''}
                                onChange={e => handleSelectMunicipio(e.target.value)}
                                disabled={!formData.estado || loadingLoc}
                                required
                            >
                                <option value="">{loadingLoc ? 'Carregando...' : 'Selecione...'}</option>
                                {municipios.map(mun => (
                                    <option key={mun.id} value={mun.id}>{mun.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Info Regional (Somente leitura se já selecionado) */}
                {formData.microregiao && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm">
                            <Search className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-[10px]">
                            <p className="font-bold text-blue-900 uppercase">Região Detectada</p>
                            <p className="text-blue-700 font-bold">{formData.rec_code ? `${formData.rec_code} (${formData.microregiao})` : `${formData.mesoregiao || 'Micro'} - ${formData.microregiao}`}</p>
                        </div>
                    </div>
                )}

                {/* Geolocation Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Map className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-800">Localização no Mapa</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                        type="button"
                        onClick={handleCurrentLocation}
                        disabled={geocoding}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                        title="Usar GPS do aparelho"
                        >
                            <MapPin className="w-4 h-4" />
                            GPS
                        </button>
                        <button
                        type="button"
                        onClick={handleGeocode}
                        disabled={geocoding}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                        {geocoding ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                        Buscar
                        </button>
                    </div>
                  </div>

                  {formData.latitude && formData.longitude && (
                    <div className="text-xs text-gray-500 mb-2">
                      📍 {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                    </div>
                  )}

                  {showMap && (
                    <Suspense fallback={
                      <div className="h-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                      </div>
                    }>
                      <FarmMap 
                        latitude={formData.latitude || undefined}
                        longitude={formData.longitude || undefined}
                        onLocationChange={handleLocationChange}
                        editable={true}
                        height="250px"
                      />
                    </Suspense>
                  )}

                  {!showMap && (
                    <div 
                      onClick={() => setShowMap(true)}
                      className="h-[100px] bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300"
                    >
                      <span className="text-gray-500 text-sm">Clique para abrir o mapa</span>
                    </div>
                  )}
                </div>

                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Proprietário</label>
                     <input 
                        type="text" 
                        placeholder="Nome completo"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                        value={formData.proprietario}
                        onChange={e => setFormData({...formData, proprietario: e.target.value})}
                     />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-6"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5"/>}
                Criar Propriedade
            </button>

        </form>
      </div>
    </div>
  );
}
