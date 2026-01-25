import React, { useState, useEffect } from 'react';
import { Mail, Shield, X, Loader2, UserCheck, Clock, Share2, MessageCircle, Crown, Info, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../../context/AppContext';
import { supabase } from '../../../supabaseClient';
import { ConfirmModal } from '../../../components/ui/Shared';

const ROLES = [
    { name: 'Operador', desc: 'Apenas lançamentos básicos do dia a dia.' },
    { name: 'Gerente', desc: 'Gestão operacional da fazenda e equipe de campo.' },
    { name: 'Administrativo', desc: 'Foco em dados financeiros, documentos e administrativo.' },
    { name: 'Consultor Agrícola', desc: 'Foco em recomendações técnicas, laudos e satélite.' },
    { name: 'Proprietário', desc: 'Acesso total e irrestrito (admin master).' }
];

export default function EquipeEditor() {
    const { fazendaId, session, fazendaNome } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [membros, setMembros] = useState<any[]>([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Operador');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [pendingInviteMsg, setPendingInviteMsg] = useState('');

    useEffect(() => {
        if (fazendaId) loadMembros();
    }, [fazendaId]);

    const loadMembros = async () => {
        if (!fazendaId) return;
        try {
            setLoading(true);
            // Busca membros com e-mail do perfil associado
            const { data, error } = await supabase
                .from('fazenda_membros')
                .select('id, user_id, fazenda_id, role, profiles(email)')
                .eq('fazenda_id', fazendaId);
            
            if (error) {
                console.error("Erro Supabase Equipe:", error);
                throw error;
            }
            
            console.log("DEBUG EQUIPE: dados brutos:", data);

            const sorted = (data || []).sort((a, b) => {
                const order: any = { 'Proprietário': 0, 'Administrativo': 1, 'Gerente': 2, 'Operador': 3, 'Consultor Agrícola': 4 };
                return (order[a.role] ?? 5) - (order[b.role] ?? 5);
            });

            setMembros(sorted);
        } catch (err: any) {
            console.error("Falha ao carregar equipe:", err);
            toast.error("Erro ao carregar equipe. Tente recarregar a página.");
        } finally {
            setLoading(false);
        }
    };

    const handleAutorizar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            // 1. Buscar o ID do usuário pelo e-mail
            const { data: profile, error: searchError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email.trim().toLowerCase())
                .maybeSingle();

            if (searchError) throw searchError;

            if (!profile) {
                const appLink = window.location.origin;
                const inviteMsg = `Olá! Convido você para a equipe da *${fazendaNome || 'nossa propriedade'}* no aplicativo *AgroVisão*.\n\nPara começar, crie sua conta em: ${appLink}\n(Cadastre-se com o e-mail: ${email.trim().toLowerCase()} para que eu possa liberar seu acesso).`;

                setPendingInviteMsg(inviteMsg);
                setShowInviteModal(true);
                
                // Copia automaticamente para facilitar
                navigator.clipboard.writeText(inviteMsg);
                return;
            }

            // 2. Verificar duplicidade
            const { data: existe, error: checkError } = await supabase
                .from('fazenda_membros')
                .select('id')
                .eq('fazenda_id', fazendaId)
                .eq('user_id', profile.id)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existe) {
                toast.error("Este e-mail já tem acesso autorizado!");
                return;
            }

            // 3. Autorizar
            const { error: insError } = await supabase
                .from('fazenda_membros')
                .insert([{
                    fazenda_id: fazendaId,
                    user_id: profile.id,
                    role: role
                }]);

            if (insError) throw insError;

            toast.success(`Acesso de ${role} autorizado com sucesso!`);
            setEmail('');
            loadMembros();
        } catch (err: any) {
            console.error("Erro na autorização:", err);
            toast.error("Erro ao autorizar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemover = async (id: string, identificador: string) => {
        if (!window.confirm(`Remover ${identificador} da equipe?`)) return;
        try {
            const { error } = await supabase
                .from('fazenda_membros')
                .delete()
                .eq('id', id)
                .eq('fazenda_id', fazendaId);
            
            if (error) throw error;
            toast.success("Membro removido.");
            loadMembros();
        } catch (err: any) {
            toast.error("Erro ao remover: " + err.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Form de Autorização Direta */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="mb-6">
                    <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        Autorizar Acesso
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium ml-7 mt-0.5">Informe o e-mail de um colaborador já cadastrado no sistema.</p>
                </div>
                
                <form onSubmit={handleAutorizar} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">E-mail do Colaborador</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input 
                                type="email" 
                                required
                                placeholder="exemplo@fazenda.com.br"
                                className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Nível de Acesso</label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROLES.map(r => (
                                <button
                                    key={r.name}
                                    type="button"
                                    onClick={() => setRole(r.name)}
                                    className={`p-3 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${role === r.name ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-50 bg-gray-50 text-gray-500 opacity-60'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[11px] font-black uppercase ${role === r.name ? 'text-indigo-700' : 'text-gray-500'}`}>
                                            {r.name}
                                        </span>
                                        {r.name === 'Proprietário' && <Crown className={`w-3 h-3 ${role === r.name ? 'text-indigo-600' : 'text-gray-400'}`} />}
                                    </div>
                                    <p className="text-[9px] leading-tight font-medium">{r.desc}</p>
                                    {role === r.name && <div className="absolute top-0 right-0 p-1"><UserCheck className="w-3 h-3 text-indigo-600" /></div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-3xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                        Autorizar Acesso Agora
                    </button>
                </form>
            </div>

            {/* Lista de Equipe */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Equipe Atual</h3>
                    <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border shadow-sm">{membros.length}</span>
                </div>

                <div className="divide-y divide-gray-50">
                    {membros.length === 0 && !loading && (
                        <div className="p-12 text-center">
                            <Shield className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm font-medium">Nenhum membro cadastrado.</p>
                        </div>
                    )}

                    {membros.map(m => (
                        <div key={m.id} className={`p-5 flex items-center justify-between group hover:bg-gray-50 transition-colors ${m.user_id === session?.user?.id ? 'bg-indigo-50/20' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    m.role === 'Proprietário' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {m.role === 'Proprietário' ? <Crown className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">
                                        {m.profiles?.email || 'Membro Externo'}
                                    </p>
                                    <span className="text-[10px] font-black uppercase text-indigo-600/70">{m.role}</span>
                                </div>
                            </div>

                            {m.role !== 'Proprietário' && (
                                <button 
                                    onClick={() => handleRemover(m.id, m.profiles?.email || 'membro')}
                                    className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Rodapé de Convite (Social) */}
            <div className="p-5 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex gap-4 items-start">
               <div className="p-2 bg-white rounded-xl shadow-sm">
                   <Info className="w-4 h-4 text-indigo-600" />
               </div>
               <div className="space-y-1">
                   <p className="text-[11px] text-indigo-900 font-black uppercase tracking-widest">Acesso Negado?</p>
                   <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                        Se o e-mail não for encontrado, o colaborador precisa criar a conta no AgroVisão primeiro.
                   </p>
                   <div className="flex flex-wrap gap-3 mt-2">
                        <button 
                            onClick={() => {
                                const appLink = window.location.origin;
                                const msg = `Olá! Convido você para a equipe da *${fazendaNome || 'nossa propriedade'}* no aplicativo *AgroVisão*.\n\nCrie sua conta aqui para eu liberar seu acesso: ${appLink}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="flex items-center gap-1.5 text-[9px] font-black bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 transition-all shadow-sm uppercase"
                        >
                             <MessageCircle className="w-3 h-3" /> Convidar via WhatsApp
                        </button>
                        <button 
                            onClick={() => {
                                const appLink = window.location.origin;
                                const msg = `Olá! Crie sua conta no aplicativo *AgroVisão* para acessar os dados da *${fazendaNome || 'nossa propriedade'}*.\n\nLink: ${appLink}`;
                                navigator.clipboard.writeText(msg);
                                toast.success("Link copiado!");
                            }}
                            className="flex items-center gap-1.5 text-[9px] font-black bg-white text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm uppercase"
                        >
                             <Share2 className="w-3 h-3" /> Copiar Link
                        </button>
                   </div>
               </div>
            </div>

            {/* Modal de Convite (Quando usuário não existe) */}
            <ConfirmModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onConfirm={() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(pendingInviteMsg)}`, '_blank');
                }}
                title="Usuário Não Encontrado"
                message={`O e-mail "${email}" ainda não possui conta no AgroVisão.\n\nA mensagem de convite já foi COPIADA para sua área de transferência! Deseja enviar agora via WhatsApp?`}
                confirmText="Enviar WhatsApp"
                cancelText="Fechar"
                variant="info"
                icon="warning"
            />
        </div>
    );
}
