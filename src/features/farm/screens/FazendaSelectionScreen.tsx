import React, { useEffect, useState } from 'react';
import { Plus, Tractor, LogOut, Check, Loader2, Search, ArrowRight, Building2, MapPin, ChevronRight, User, Calendar, Phone, CreditCard, Mail, RefreshCw, Clock } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { supabase } from '../../../supabaseClient';
import { U } from '../../../utils';
import { ConfirmModal, Input } from '../../../components/ui/Shared';
import { toast } from 'react-hot-toast';

export default function FazendaSelectionScreen() {
  const { session, dispatch, setTela, logout, setFazendaSelecionada, ensureMembroOwner } = useAppContext();
  const [fazendas, setFazendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState<'loading' | 'profile' | 'selection'>('loading');
  
  // Form Profile (Dados Globais)
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cnhNumber, setCnhNumber] = useState('');
  const [cnhExpiry, setCnhExpiry] = useState('');

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

      // 4. Determinar se pode criar novas fazendas
      const isOwner = (fazendasOwner || []).length > 0;
      const isProprietarioMembro = (participacoes || []).some((p: any) => p.role === 'Proprietário');

      if (todas.length === 0) {
          setCanCreate(true);
      } else {
          setCanCreate(isOwner || isProprietarioMembro);
      }

      // 5. Ir direto para seleção (sem barreira de perfil)
      setOnboardingStep('selection');

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
            userRole: membro?.role,
            config: fazenda.config
        });
        setFazendaSelecionada(fazenda);
        
        // 2. Auto-reparo e Inicialização de Dados Padrão (Seed)
        if (fazenda.user_id === session?.user?.id) {
            await ensureMembroOwner(fazenda.id, session?.user);
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

  const applyPhoneMask = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (v.length > 6) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    if (v.length > 2) return v.replace(/(\d{2})(\d{0,4})/, "($1) $2");
    return v;
  };

  const applyCNHMask = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
    if (v.length > 3) return v.replace(/(\d{3})(\d{0,3})/, "$1.$2");
    return v;
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return toast.error("Por favor, informe seu nome.");

    try {
        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({ 
                full_name: userName.trim(),
                phone: userPhone.replace(/\D/g, ''),
                data_nascimento: birthDate || null,
                config: {
                    cnh_numero: cnhNumber.replace(/\D/g, ''),
                    cnh_vencimento: cnhExpiry || null
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', session?.user?.id);

        if (error) throw error;
        
        toast.success("Perfil atualizado! Vamos lá.");
        setOnboardingStep('selection');
    } catch (err: any) {
        console.error("Erro ao salvar perfil:", err);
        toast.error("Erro ao salvar seus dados.");
    } finally {
        setLoading(false);
    }
  };

  if (onboardingStep === 'loading') {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Preparando Campo...</p>
        </div>
    );
  }

  if (onboardingStep === 'profile') {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl border border-gray-100 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-indigo-50 rounded-[2.2rem] flex items-center justify-center mb-8 shadow-inner border border-indigo-100/50">
                    <User className="w-10 h-10 text-indigo-600" />
                </div>
                
                <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Bem-vindo!</h2>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-10">
                    Para começarmos, como devemos te chamar e qual seu contato?
                </p>

                <form onSubmit={handleSaveProfile} className="w-full space-y-5 text-left">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seu Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                            <input 
                                type="text" 
                                required
                                value={userName}
                                onChange={e => setUserName(e.target.value)}
                                placeholder="Ex: João da Silva"
                                className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none placeholder:text-[10px] placeholder:text-gray-400/70"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nascimento</label>
                            <div className="relative">
                                <Input 
                                    type="date" 
                                    value={birthDate}
                                    onChange={(e: any) => {
                                        let val = e.target.value;
                                        if (val.length > 10) val = val.slice(0, 10);
                                        setBirthDate(val);
                                    }}
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none uppercase placeholder:text-[10px] placeholder:text-gray-400/70"
                                />
                                <Calendar className="absolute left-4 top-4 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <input 
                                    type="tel" 
                                    value={userPhone}
                                    onChange={e => setUserPhone(applyPhoneMask(e.target.value))}
                                    placeholder="(00) 00000-0000"
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none placeholder:text-[10px] placeholder:text-gray-400/70"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número CNH</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={cnhNumber}
                                    onChange={e => setCnhNumber(applyCNHMask(e.target.value))}
                                    placeholder="000.000.000-00"
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none placeholder:text-[10px] placeholder:text-gray-400/70"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vencimento CNH</label>
                            <div className="relative">
                                <Input 
                                    type="date" 
                                    value={cnhExpiry}
                                    onChange={(e: any) => {
                                        let val = e.target.value;
                                        if (val.length > 10) val = val.slice(0, 10);
                                        setCnhExpiry(val);
                                    }}
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none uppercase placeholder:text-[10px] placeholder:text-gray-400/70"
                                />
                                <Calendar className="absolute left-4 top-4 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-[9px] text-indigo-400 font-medium italic ml-1 -mt-2">
                        * O vencimento é para sua comodidade, alertaremos você 30 dias antes.
                    </p>

                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-[0.2em]"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                            Concluir Cadastro
                        </button>
                    </div>
                    
                    <button 
                        type="button"
                        onClick={logout}
                        className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                    >
                        Sair da Conta
                    </button>
                </form>
            </div>
        </div>
    );
  }

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
                
                {/* LISTA DE FAZENDAS */}
                {fazendas.length > 0 && (
                    <>
                        {fazendas.map(fazenda => (
                            <div 
                                key={fazenda.id}
                                onClick={() => handleSelectFazenda(fazenda)}
                                className="group bg-white rounded-3xl p-6 shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all text-left flex flex-col gap-4 relative overflow-hidden cursor-pointer active:scale-95"
                            >
                                <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden shadow-inner">
                                    {fazenda.config?.logo_base64 ? (
                                        <img src={fazenda.config.logo_base64} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 className="w-7 h-7 text-indigo-700 group-hover:text-white" />
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-700 transition-colors leading-tight">
                                        {fazenda.nome || 'Fazenda Sem Nome'}
                                    </h3>
                                    <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                                        <MapPin className="w-3 h-3 text-indigo-400" />
                                        {fazenda.cidade || 'Localização'} - {fazenda.estado || 'UF'}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center w-full">
                                    <span className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest">
                                        {fazenda.tamanho_ha ? `${fazenda.tamanho_ha} ha` : 'Área n/d'}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* BOTÃO ADICIONAR (MODO REDUZIDO) - Apenas se tiver permissão */}
                        {canCreate && (
                            <button 
                                onClick={() => setTela('create_fazenda')}
                                className="group bg-gray-50 rounded-3xl p-8 border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-white transition-all flex flex-col items-center justify-center gap-3 active:scale-95"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest group-hover:text-indigo-600">Nova Propriedade</span>
                            </button>
                        )}
                    </>
                )}

                {/* TELA DE BOAS-VINDAS BIMODAL (SE ESTIVER VAZIO) */}
                {fazendas.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full mt-4">
                        
                        {/* CAMINHO A: PROPRIETÁRIO - Apenas se puder criar */}
                        {canCreate && (
                            <div 
                                onClick={() => setTela('create_fazenda')}
                                className="group bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 hover:shadow-2xl hover:border-green-500/30 transition-all cursor-pointer flex flex-col items-center text-center relative overflow-hidden active:scale-95"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                                    <Building2 className="w-32 h-32" />
                                </div>
                                <div className="w-20 h-20 bg-green-50 rounded-[2.2rem] flex items-center justify-center mb-6 shadow-inner border border-green-100/50 group-hover:bg-green-600 group-hover:text-white transition-all duration-500">
                                    <Plus className="w-10 h-10 text-green-600 group-hover:text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Sou o Gestor</h3>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                                    Quero cadastrar minha fazenda do zero, definir talhões e gerenciar toda a operação.
                                </p>
                                <div className="mt-auto inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-200 group-hover:bg-green-700 group-hover:-translate-y-1 transition-all">
                                    Começar Agora <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        )}

                        {/* CAMINHO B: CONVIDADO */}
                        <div 
                            className="group bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 hover:shadow-2xl hover:border-indigo-500/30 transition-all flex flex-col items-center text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-[0.05] rotate-12">
                                <Mail className="w-32 h-32" />
                            </div>
                            
                            <div className="w-20 h-20 bg-indigo-50 rounded-[2.2rem] flex items-center justify-center mb-6 shadow-inner border border-indigo-100/50 group-hover:bg-indigo-600 transition-all duration-500">
                                <Mail className="w-10 h-10 text-indigo-600 group-hover:text-white" />
                            </div>

                            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Fui Convidado</h3>
                            
                            <div className="space-y-4 mb-8">
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                    Se você faz parte de uma equipe, sua fazenda aparecerá assim que for autorizada para:
                                </p>
                                <div className="bg-gray-50 px-4 py-3 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-sm font-black text-indigo-600 break-all">{session?.user?.email}</p>
                                </div>
                            </div>

                            <button 
                                onClick={loadFazendas}
                                className="mt-auto w-full bg-white border-2 border-indigo-100 text-indigo-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sincronizar Convites
                            </button>
                            
                            <div className="mt-4 flex items-center gap-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">
                                <Clock className="w-3 h-3" /> Verificando acesso em tempo real
                            </div>
                        </div>

                    </div>
                )}

            </div>
        )}

      </div>
    </div>
  );
}
