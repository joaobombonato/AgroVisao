import React, { useState, Suspense } from 'react';
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
  const [formData, setFormData] = useState({
    nome: '',
    tamanho_ha: '',
    cidade: '',
    estado: '',
    proprietario: '',
    latitude: null as number | null,
    longitude: null as number | null
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    setLoading(true);

    try {
       // Cria registro na tabela 'fazendas' com geolocalização
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
                // Configuração inicial padrão
                config: {
                    parametros: {},
                    menuOrder: []
                }
            }
        ])
        .select();

       if (error) throw error;
       
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Ex: Paracatu" 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                value={formData.cidade}
                                onChange={e => setFormData({...formData, cidade: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
                        <input 
                            type="text" 
                            placeholder="MG"
                            maxLength={2}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all uppercase"
                            value={formData.estado}
                            onChange={e => setFormData({...formData, estado: e.target.value.toUpperCase()})}
                        />
                    </div>
                </div>

                {/* Geolocation Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Map className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-800">Localização no Mapa</span>
                    </div>
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
