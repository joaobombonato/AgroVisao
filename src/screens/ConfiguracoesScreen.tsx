
import React, { useState } from 'react';
import { ListPlus, LogOut, Shield, ChevronRight, List, Settings, Trash2, Edit2, Check, X, ShieldAlert, Users, Info, Building2, Sliders, Save, ArrowRight, UserCircle} from 'lucide-react';
import { PageHeader } from '../components/ui/Shared';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import { ASSET_DEFINITIONS } from '../data/assets';
import { APP_VERSION } from '../data/constants';
import AssetListEditor from '../features/settings/components/AssetListEditor';
import EquipeEditor from '../features/settings/components/EquipeEditor';
import PermissionsEditor from '../features/settings/components/PermissionsEditor';
import ParametrosEditor from '../features/settings/components/ParametrosEditor';
import FazendaPerfilEditor from '../features/settings/components/FazendaPerfilEditor';
import MinhaContaEditor from '../features/settings/components/MinhaContaEditor';

export default function ConfiguracoesScreen() {
    const { state, logout, dispatch, setTela } = useAppContext();
    const { userRole, fazendaNome } = state;
    
    const [view, setView] = useState('menu'); // 'menu', 'listas', 'equipe', 'permissoes', 'fazenda', 'parametros', 'editor', 'conta'
    const [activeAsset, setActiveAsset] = useState<string | null>(null);

    // Ordens de exibição (Unificadas)
    const dbOrder = ['maquinas', 'talhoes', 'centrosCusto', 'produtos', 'locaisChuva', 'locaisEnergia'];
    const localOrder = ['safras', 'culturas', 'tiposRefeicao'];

    const handleOpenEditor = (key: string) => {
        setActiveAsset(key);
        setView('editor');
    };

    const handleLogout = () => {
        dispatch({ type: ACTIONS.SET_MODAL, modal: { 
            isOpen: true, 
            type: 'confirm',
            props: {
                title: 'Sair do Sistema',
                message: 'Deseja realmente sair do sistema?', 
                onConfirm: () => logout(),
                variant: 'danger',
                icon: 'logout'
            }
        }});
    };

    // Sub-componente de Botão de Menu
    const MenuButton = ({ icon: Icon, title, desc, onClick, color = 'bg-gray-50', badge }: any) => (
        <button 
            onClick={onClick}
            className="w-full flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group hover:border-indigo-200 transition-all active:scale-95"
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} group-hover:bg-indigo-600 group-hover:text-white transition-colors`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800 group-hover:text-indigo-900 transition-colors uppercase tracking-tight text-sm">{title}</p>
                    {badge && <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">{badge}</span>}
                </div>
                <p className="text-[10px] text-gray-400 font-medium leading-tight">{desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
        </button>
    );

    // Container padrão para sub-telass com Header
    const EditorContainer = ({ title, icon: Icon, color, children, onBack }: any) => (
        <div className="space-y-6 p-4 pb-24 max-w-md mx-auto min-h-screen bg-gray-50/50">
            <PageHeader setTela={onBack} title={title} icon={Icon} colorClass={color} backTarget="menu" />
            {children}
        </div>
    );

    // ==========================================
    // RENDERIZAÇÃO
    // ==========================================

    // 1. TELA DE EDITOR DE ATIVOS
    if (view === 'editor' && activeAsset) {
        return <AssetListEditor assetKey={activeAsset} setView={() => setView('listas')} />;
    }

    // 2. TELA DE LISTAS (UNIFICADA)
    if (view === 'listas') {
        return (
            <EditorContainer title="Cadastros & Listas" icon={ListPlus} color="bg-indigo-600" onBack={() => setView('menu')}>
                <div className="space-y-4">
                    <div className="flex justify-between items-center pt-2 px-1 border-b border-gray-100 pb-2">
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Itens Disponíveis</h2>
                    </div>

                    <div className="space-y-3">
                        {[...dbOrder, ...localOrder].map((key: string) => {
                            const def: any = ASSET_DEFINITIONS[key];
                            if (!def) return null;
                            
                            return (
                                <div 
                                    key={key} 
                                    className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group hover:border-indigo-200 transition-all active:scale-95 cursor-pointer"
                                    onClick={() => handleOpenEditor(key)}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${def.color}-50 text-${def.color}-600 group-hover:bg-${def.color}-600 group-hover:text-white transition-colors`}>
                                        <def.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-900 transition-colors uppercase tracking-tight">{def.title}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">{def.label || 'Gerenciar itens'}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </EditorContainer>
        );
    }

    // 3. OUTRAS TELAS COM WRAPPER DE HEADER
    if (view === 'conta') {
        return (
            <EditorContainer title="Minha Conta" icon={UserCircle} color="bg-indigo-700" onBack={() => setView('menu')}>
                <MinhaContaEditor />
            </EditorContainer>
        );
    }

    if (view === 'equipe') {
        return (
            <EditorContainer title="Gestão de Equipe" icon={Users} color="bg-orange-500" onBack={() => setView('menu')}>
                <EquipeEditor />
            </EditorContainer>
        );
    }

    if (view === 'permissoes') {
        return (
            <EditorContainer title="Permissões" icon={Shield} color="bg-red-600" onBack={() => setView('menu')}>
                <PermissionsEditor />
            </EditorContainer>
        );
    }

    if (view === 'fazenda') {
        return (
            <EditorContainer title="Minha Fazenda" icon={Building2} color="bg-blue-600" onBack={() => setView('menu')}>
                <FazendaPerfilEditor />
            </EditorContainer>
        );
    }

    if (view === 'parametros') {
        return (
            <EditorContainer title="Parâmetros Gerais" icon={Sliders} color="bg-teal-600" onBack={() => setView('menu')}>
                <ParametrosEditor onBack={() => setView('menu')} />
            </EditorContainer>
        );
    }

    // 4. MENU PRINCIPAL DE CONFIGURAÇÕES
    return (
        <div className="space-y-6 p-4 pb-24 max-w-md mx-auto min-h-screen bg-gray-50/50">
            <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-800" backTarget={'principal'} />

            {/* Perfil do Usuário */}
            <div className="space-y-3">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Usuário</h2>
                <MenuButton 
                    icon={UserCircle} 
                    title="Minha Conta" 
                    desc="Meus dados, CNH e segurança" 
                    onClick={() => setView('conta')} 
                    color="bg-indigo-50"
                />
            </div>

            {/* Perfil e Fazenda */}
            <div className="space-y-3">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Propriedade</h2>
                <MenuButton 
                    icon={Building2} 
                    title="Minha Fazenda" 
                    desc={fazendaNome || "Dados da propriedade"} 
                    onClick={() => setView('fazenda')} 
                    color="bg-blue-50"
                />
            </div>

            {/* Gestão e Operação */}
            <div className="space-y-3">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Gestão Operacional</h2>
                <MenuButton 
                    icon={ListPlus} 
                    title="Cadastros & Listas" 
                    desc="Máquinas, Talhões, Centros de Custo, etc." 
                    onClick={() => setView('listas')} 
                    color="bg-indigo-50"
                />
                <MenuButton 
                    icon={Users} 
                    title="Gestão de Equipe" 
                    desc="Membros e Convites de Acesso" 
                    onClick={() => setView('equipe')} 
                    color="bg-orange-50"
                />
                {userRole === 'Proprietário' && (
                    <MenuButton 
                        icon={Shield} 
                        title="Permissões" 
                        desc="Quem pode ver o quê no AgroVisão" 
                        onClick={() => setView('permissoes')} 
                        color="bg-red-50"
                    />
                )}
            </div>

            {/* Avançado */}
            <div className="space-y-3">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Sistema</h2>
                <MenuButton 
                    icon={Sliders} 
                    title="Parâmetros Gerais" 
                    desc="Moeda, Unidades e Metas" 
                    onClick={() => setView('parametros')} 
                    color="bg-teal-50"
                />
            </div>

            {/* Logout */}
            <div className="pt-4 border-t border-gray-100">
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 p-4 rounded-2xl font-black uppercase text-xs hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
                >
                    <LogOut className="w-5 h-5" /> Sair do Sistema
                </button>
            </div>

            <div className="text-center space-y-4">
                <div>
                  <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">AgroVisão Enterprise {APP_VERSION}</p>
                  <p className="text-[9px] text-gray-200 mt-1">Conectado de forma segura via Cloud</p>
                </div>

                {/* Bloco de Logos solicitado pelo usuário */}
                <div className="flex flex-col items-center justify-center gap-6 pt-4 pb-4 opacity-70">
                    <img 
                        src="/logo-full.png" 
                        alt="AgroVisão" 
                        className="h-14 object-contain hover:scale-105 transition-transform cursor-pointer" 
                    />
                    
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Desenvolvido por</span>
                        <img 
                            src="/logo-full-praticoapp.png" 
                            alt="PraticoAPP" 
                            className="h-10 object-contain hover:scale-105 transition-transform cursor-pointer" 
                            onClick={() => window.open('https://praticoapp.com.br', '_blank')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}