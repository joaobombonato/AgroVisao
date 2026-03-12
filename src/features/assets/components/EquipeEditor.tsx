import React, { useState, useEffect } from 'react';
import { Mail, Shield, Loader2, UserCheck, Crown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../../context/AppContext';
import { supabase } from '../../../supabaseClient';
import { ConfirmModal } from '../../../components/ui/Shared';
import { MemberCard } from './MemberCard';
import { PendingInviteCard } from './PendingInviteCard';
import { InviteFooter } from './InviteFooter';

const ROLES = [
    { name: 'Operador', desc: 'Apenas lançamentos básicos do dia a dia.' },
    { name: 'Gerente', desc: 'Gestão operacional da fazenda e equipe de campo.' },
    { name: 'Administrativo', desc: 'Foco em dados financeiros, documentos e administrativo.' },
    { name: 'Consultor Agrícola', desc: 'Foco em recomendações técnicas, laudos e satélite.' },
    { name: 'Proprietário', desc: 'Acesso total e irrestrito (admin master).' }
];

export default function EquipeEditor() {
    const { fazendaId, session, fazendaNome, rolePermissions, state } = useAppContext();
    const userRole = state?.userRole;
    const canManage = userRole !== 'Operador' && rolePermissions?.actions?.config_equipe !== false;
    const [loading, setLoading] = useState(false);
    const [membros, setMembros] = useState<any[]>([]);
    const [convites, setConvites] = useState<any[]>([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Operador');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [pendingInviteMsg, setPendingInviteMsg] = useState('');
    const [pendingInviteData, setPendingInviteData] = useState<any>(null);
    const [membroParaRemover, setMembroParaRemover] = useState<any>(null);
    const [conviteParaCancelar, setConviteParaCancelar] = useState<any>(null);

    useEffect(() => {
        if (fazendaId) loadMembros();
    }, [fazendaId]);

    const loadMembros = async () => {
        if (!fazendaId) return;
        try {
            setLoading(true);
            
            const { data: membrosDb, error: errMembros } = await supabase
                .from('fazenda_membros')
                .select('id, user_id, fazenda_id, role, profiles(email, full_name)')
                .eq('fazenda_id', fazendaId);
            
            if (errMembros) throw errMembros;

            const { data: convitesDb, error: errConvites } = await supabase
                .from('fazenda_convites')
                .select('*')
                .eq('fazenda_id', fazendaId);

            if (errConvites) throw errConvites;
            
            const sortedMembros = (membrosDb || []).sort((a, b) => {
                const order: any = { 'Proprietário': 0, 'Administrativo': 1, 'Gerente': 2, 'Operador': 3, 'Consultor Agrícola': 4 };
                return (order[a.role] ?? 5) - (order[b.role] ?? 5);
            });

            setMembros(sortedMembros);
            setConvites(convitesDb || []);
        } catch (err: any) {
            console.error("Falha ao carregar equipe:", err);
            toast.error("Erro ao carregar equipe.");
        } finally {
            setLoading(false);
        }
    };

    const handleAutorizar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !canManage) return;

        setLoading(true);
        try {
            const { data: profile, error: searchError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email.trim().toLowerCase())
                .maybeSingle();

            if (searchError) throw searchError;

            if (!profile) {
                setPendingInviteData({ email: email.trim().toLowerCase(), role });
                
                const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
                const appLink = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
                const inviteMsg = `Olá! Pré-autorizei seu acesso como *${role}* na equipe da *${fazendaNome || 'nossa propriedade'}* no AgroVisão.\n\nCrie sua conta agora para acessar os dados: ${appLink}?mode=register\n(Use o e-mail: ${email.trim().toLowerCase()})`;

                setPendingInviteMsg(inviteMsg);
                setShowInviteModal(true);
                navigator.clipboard.writeText(inviteMsg);
                return;
            }

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

            const { error: insError } = await supabase
                .from('fazenda_membros')
                .insert([{ fazenda_id: fazendaId, user_id: profile.id, role: role }]);

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

    const confirmarRemocao = async () => {
        if (!membroParaRemover || !canManage) return;
        const idParaRemover = membroParaRemover.id;
        
        try {
            // Feedback visual imediato (Opcional, mas ajuda muito na percepção de velocidade)
            setMembros(prev => prev.filter(m => m.id !== idParaRemover));
            
            const { error } = await supabase
                .from('fazenda_membros')
                .delete()
                .eq('id', idParaRemover);
            
            if (error) {
                // Se der erro, volta o membro para a lista
                loadMembros();
                throw error;
            }
            
            toast.success("Membro removido com sucesso!");
            // loadMembros(); // Opcional, já removemos localmente
        } catch (err: any) {
            console.error("Erro ao remover:", err);
            toast.error("Não foi possível remover: " + err.message);
        } finally {
            setMembroParaRemover(null);
        }
    };

    const confirmarCancelamentoConvite = async () => {
        if (!conviteParaCancelar || !canManage) return;
        try {
            const { error } = await supabase
                .from('fazenda_convites')
                .delete()
                .eq('id', conviteParaCancelar.id);
            
            if (error) throw error;
            toast.success("Convite cancelado.");
            loadMembros();
        } catch (err: any) {
            toast.error("Erro ao cancelar: " + err.message);
        } finally {
            setConviteParaCancelar(null);
        }
    };

    const confirmarConvitePendente = async () => {
        if (!pendingInviteData || !canManage) return;
        try {
            setLoading(true);
            
            const { error: dbError } = await supabase
                .from('fazenda_convites')
                .insert([{
                    fazenda_id: fazendaId,
                    email: pendingInviteData.email,
                    role: pendingInviteData.role,
                    convidado_por: session?.user?.id
                }]);

            if (dbError) throw dbError;

            try {
                const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
                const redirectTo = `${siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`}?mode=invite`;
                
                const { error: funcError } = await supabase.functions.invoke('invite-staff', {
                    body: { email: pendingInviteData.email, redirectTo }
                });
                if (funcError) console.warn("Erro ao disparar e-mail:", funcError);
                else toast.success("E-mail de convite enviado!");
            } catch (fErr) {
                console.warn("Falha na função de e-mail:", fErr);
            }

            toast.success("Convite registrado no sistema!");
            setEmail('');
            loadMembros();
            setShowInviteModal(false);
        } catch (err: any) {
            console.error("Erro no processo de convite:", err);
            toast.error("Erro ao registrar convite.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Alerta de Permissões */}
            {canManage && (
                <div className={`border rounded-3xl p-4 flex gap-3 shadow-sm border-dashed ${canManage ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        <Shield className={`w-6 h-6 ${canManage ? 'text-amber-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="space-y-0.5">
                        <p className={`text-[11px] font-black uppercase tracking-widest ${canManage ? 'text-amber-900' : 'text-blue-900'}`}>{canManage ? 'Atenção Administrativa' : 'Modo de Visualização'}</p>
                        <p className={`text-[10px] leading-relaxed font-medium ${canManage ? 'text-amber-800' : 'text-blue-800'}`}>
                            {canManage 
                                ? "Antes de autorizar novos acessos, recomendamos revisar as Permissões para conferir o que cada cargo poderá visualizar." 
                                : "Você tem acesso para visualizar a equipe da fazenda, mas não possui permissão para convidar ou remover membros."}
                        </p>
                    </div>
                </div>
            )}

            {/* Form de Autorização */}
            {canManage && (
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
            )}

            {/* Lista de Equipe */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Equipe Atual</h3>
                    <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border shadow-sm">{membros.length}</span>
                </div>

                <div className="divide-y divide-gray-50">
                    {(membros.length === 0 && convites.length === 0) && !loading && (
                        <div className="p-12 text-center">
                            <Shield className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm font-medium">Nenhum membro cadastrado.</p>
                        </div>
                    )}

                    {/* Membros Ativos */}
                    {membros.map(m => (
                        <MemberCard 
                            key={m.id}
                            membro={m}
                            canManage={canManage}
                            isCurrentUser={m.user_id === session?.user?.id}
                            onRemove={() => setMembroParaRemover({ id: m.id, email: m.profiles?.email || 'membro' })}
                        />
                    ))}

                    {/* Convites Pendentes */}
                    {convites.map(c => (
                        <PendingInviteCard 
                            key={c.id}
                            convite={c}
                            canManage={canManage}
                            onCancel={() => setConviteParaCancelar({ id: c.id, email: c.email })}
                        />
                    ))}
                </div>
            </div>

            {/* Rodapé de Convite Social */}
            {canManage && <InviteFooter fazendaNome={fazendaNome || ''} />}

            {/* Modais */}
            <ConfirmModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onConfirm={confirmarConvitePendente}
                title="Novo Convite"
                message={`O e-mail "${email}" ainda não possui conta no AgroVisão.\n\nDeseja PRÉ-AUTORIZAR este e-mail como ${role}? Assim que o colaborador se cadastrar, ele terá acesso automático!\n\nA mensagem para WhatsApp também já foi copiada.`}
                confirmText="Autorizar e Enviar"
                cancelText="Cancelar"
                variant="info"
                icon="warning"
            />

            <ConfirmModal 
                isOpen={!!membroParaRemover}
                onClose={() => setMembroParaRemover(null)}
                onConfirm={confirmarRemocao}
                title="Remover Membro"
                message={`Tem certeza que deseja remover ${membroParaRemover?.email} da equipe? O acesso será revogado imediatamente.`}
                confirmText="Remover"
                variant="danger"
            />

            <ConfirmModal 
                isOpen={!!conviteParaCancelar}
                onClose={() => setConviteParaCancelar(null)}
                onConfirm={confirmarCancelamentoConvite}
                title="Cancelar Convite"
                message={`Tem certeza que deseja cancelar o convite para ${conviteParaCancelar?.email}?`}
                confirmText="Cancelar Convite"
                variant="danger"
            />
        </div>
    );
}
