import React, { useEffect, useState } from 'react';
import { Plus, LogOut, Loader2 } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { supabase } from '../../../supabaseClient';
import { toast } from 'react-hot-toast';
import { FazendaCard } from '../components/FazendaCard';
import { EmptyFazendaView } from '../components/EmptyFazendaView';
import { ProfileOnboarding } from '../components/ProfileOnboarding';

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

  // TELA DE LOADING
  if (onboardingStep === 'loading') {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Preparando Campo...</p>
        </div>
    );
  }

  // TELA DE ONBOARDING (PERFIL)
  if (onboardingStep === 'profile') {
    return (
        <ProfileOnboarding 
            loading={loading}
            userName={userName}
            setUserName={setUserName}
            userPhone={userPhone}
            setUserPhone={setUserPhone}
            birthDate={birthDate}
            setBirthDate={setBirthDate}
            cnhNumber={cnhNumber}
            setCnhNumber={setCnhNumber}
            cnhExpiry={cnhExpiry}
            setCnhExpiry={setCnhExpiry}
            onSave={handleSaveProfile}
            onLogout={logout}
        />
    );
  }

  // TELA PRINCIPAL DE SELEÇÃO
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
                            <FazendaCard 
                                key={fazenda.id}
                                fazenda={fazenda}
                                onClick={() => handleSelectFazenda(fazenda)}
                            />
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
                    <EmptyFazendaView 
                        canCreate={canCreate}
                        loading={loading}
                        userEmail={session?.user?.email || ''}
                        onCreateFazenda={() => setTela('create_fazenda')}
                        onRefresh={loadFazendas}
                    />
                )}

            </div>
        )}

      </div>
    </div>
  );
}
