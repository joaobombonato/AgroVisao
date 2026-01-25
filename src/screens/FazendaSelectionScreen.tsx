import React, { useEffect, useState } from 'react';
import { Plus, ChevronRight, Tractor, Building2, MapPin, Loader2, LogOut, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { toast } from 'react-hot-toast';

export default function FazendaSelectionScreen() {
  const { session, dispatch, setTela, logout, setFazendaSelecionada, ensureMembroOwner } = useAppContext();
  const [fazendas, setFazendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadFazendas();
    }
  }, [session]);

  const loadFazendas = async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      
      // 1. Buscar fazendas onde é o proprietário
      const { data: fazendasOwner, error: errorOwner } = await supabase
        .from('fazendas')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (errorOwner) throw errorOwner;

      // 2. Buscar fazendas onde é membro (convidado)
      const { data: participacoes, error: errorMembros } = await supabase
        .from('fazenda_membros')
        .select('fazenda_id, fazendas(*)')
        .eq('user_id', session.user.id);

      if (errorMembros) {
          console.warn("Erro ao buscar participações:", errorMembros);
      }

      const fazendasParticipante = (participacoes || [])
        .map((p: any) => p.fazendas)
        .filter(Boolean);
      
      // 3. Mesclar listas sem duplicatas
      const todas = [...(fazendasOwner || [])];
      fazendasParticipante.forEach(f => {
          if (!todas.find(ownerF => ownerF.id === f.id)) {
              todas.push(f);
          }
      });

      setFazendas(todas);
    } catch (error) {
      console.error('Erro ao carregar fazendas:', error);
      toast.error("Erro ao carregar propriedades.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFazenda = async (fazenda: any) => {
    setLoading(true);
    try {
        // Buscar o papel do usuário nessa fazenda
        const { data: membro } = await supabase
            .from('fazenda_membros')
            .select('role')
            .eq('fazenda_id', fazenda.id)
            .eq('user_id', session?.user?.id)
            .maybeSingle();

        // 1. Setar fazenda no contexto global
        dispatch({ 
            type: ACTIONS.SET_FAZENDA, 
            fazendaId: fazenda.id, 
            fazendaNome: fazenda.nome,
            userRole: membro?.role
        });
        setFazendaSelecionada(fazenda);
        
        // 2. Auto-reparo: garante que o dono esteja na tabela de membros se for o criador
        if (fazenda.user_id === session?.user?.id) {
            ensureMembroOwner(fazenda.id, session?.user);
        }

        // 3. Salvar preferência localmente para autologin futuro
        localStorage.setItem('last_fazenda_id', fazenda.id);
        
        // 4. Notificar sucesso
        toast.success(`Bem-vindo à ${fazenda.nome}!`);

        // 5. Redirecionar para o principal
        setTela('principal');
    } catch (err) {
        console.error("Erro ao selecionar fazenda:", err);
        toast.error("Erro ao acessar a fazenda.");
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteFazenda = async (e: React.MouseEvent, fazenda: any) => {
    e.stopPropagation(); // Evita selecionar a fazenda ao clicar no lixo
    
    const confirm = window.confirm(`ATENÇÃO: Você tem certeza que deseja EXCLUIR PERMANENTEMENTE a fazenda "${fazenda.nome}"? Todos os dados associados serão perdidos.`);
    if (!confirm) return;

    try {
      setLoading(true);
      // Primeiro remove os membros (ou confia no cascade se existir)
      // Como não temos certeza do cascade, tentamos limpar a equipe
      await supabase.from('fazenda_membros').delete().eq('fazenda_id', fazenda.id);
      
      const { error } = await supabase
        .from('fazendas')
        .delete()
        .eq('id', fazenda.id);
      
      if (error) throw error;
      
      toast.success("Propriedade excluída com sucesso.");
      loadFazendas();
    } catch (error: any) {
      console.error("Erro ao excluir fazenda:", error);
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setLoading(false);
    }
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
                    <div 
                        key={fazenda.id}
                        onClick={() => handleSelectFazenda(fazenda)}
                        className="group bg-white rounded-2xl p-6 shadow-sm border-2 border-transparent hover:border-green-500 hover:shadow-md transition-all text-left flex flex-col gap-4 relative overflow-hidden cursor-pointer"
                    >
                        {/* BOTÃO EXCLUIR (Apenas para o dono) */}
                        {fazenda.user_id === session?.user?.id && (
                            <button 
                                onClick={(e) => handleDeleteFazenda(e, fazenda)}
                                className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"
                                title="Excluir Propriedade"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}

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
                    </div>
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

                {fazendas.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-2 flex flex-col justify-center p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <h3 className="text-indigo-900 font-bold mb-2 flex items-center gap-2">
                             <Tractor className="w-5 h-5" /> Você foi convidado?
                        </h3>
                        <p className="text-sm text-indigo-700 leading-relaxed">
                            Se você foi convidado para uma equipe, peça para o seu gestor te autorizar usando seu e-mail: <br/>
                            <strong className="text-indigo-900">{session?.user?.email}</strong>. <br/>
                            Assim que ele te autorizar, a fazenda aparecerá aqui automaticamente!
                        </p>
                    </div>
                )}

            </div>
        )}

      </div>
    </div>
  );
}
