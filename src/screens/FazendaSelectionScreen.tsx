import React, { useEffect, useState } from 'react';
import { Plus, ChevronRight, Tractor, Building2, MapPin, Loader2, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { toast } from 'react-hot-toast';

export default function FazendaSelectionScreen() {
  const { session, dispatch, setTela, logout, setFazendaSelecionada } = useAppContext();
  const [fazendas, setFazendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFazendas();
  }, []);

  const loadFazendas = async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      // Busca fazendas onde o usuário é dono ou membro (ajustar query conforme estrutura real)
      // Por enquanto, assumindo tabela 'fazendas' linkada ao user_id
      const { data, error } = await supabase
        .from('fazendas')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      setFazendas(data || []);
    } catch (error) {
      console.error('Erro ao carregar fazendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFazenda = async (fazenda: any) => {
    // 1. Setar fazenda no contexto global
    dispatch({ 
        type: ACTIONS.SET_FAZENDA, 
        fazendaId: fazenda.id, 
        fazendaNome: fazenda.nome 
    });
    setFazendaSelecionada(fazenda);
    
    // 2. Salvar preferência localmente para autologin futuro
    localStorage.setItem('last_fazenda_id', fazenda.id);
    
    // 3. Notificar sucesso
    toast.success(`Fazenda selecionada: ${fazenda.nome}!`);

    // 4. Redirecionar para o principal
    setTela('principal');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
                <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain" />
                <h1 className="text-2xl font-bold text-gray-800">Selecione a Propriedade</h1>
            </div>
            <button 
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
                <LogOut className="w-4 h-4" /> Sair
            </button>
        </div>

        {loading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* CARD DE FAZENDA EXISTENTE */}
                {fazendas.map(fazenda => (
                    <button 
                        key={fazenda.id}
                        onClick={() => handleSelectFazenda(fazenda)}
                        className="group bg-white rounded-2xl p-6 shadow-sm border-2 border-transparent hover:border-green-500 hover:shadow-md transition-all text-left flex flex-col gap-4 relative overflow-hidden"
                    >
                        <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors overflow-hidden">
                            {fazenda.config?.logo_base64 ? (
                                <img src={fazenda.config.logo_base64} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Building2 className="w-6 h-6 text-green-700 group-hover:text-white" />
                            )}
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                                {fazenda.nome || 'Fazenda Sem Nome'}
                            </h3>
                            <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                                <MapPin className="w-3 h-3" />
                                {fazenda.cidade || 'Localização não definida'} - {fazenda.estado || 'UF'}
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center w-full">
                            <span className="text-xs font-medium text-gray-400">
                                {fazenda.tamanho_ha ? `${fazenda.tamanho_ha} hectares` : 'Área n/d'}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                        </div>
                    </button>
                ))}

                {/* CARD DE CRIAR NOVA FAZENDA */}
                <button 
                    onClick={() => setTela('create_fazenda')}
                    className="group bg-gray-100 rounded-2xl p-6 border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all flex flex-col items-center justify-center gap-4 min-h-[200px]"
                >
                    <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="font-semibold text-gray-600 group-hover:text-green-700">Cadastrar Nova Propriedade</span>
                </button>

            </div>
        )}

      </div>
    </div>
  );
}
