
import React, { useState } from 'react';
import { ListPlus, LogOut, Shield, ChevronRight, List, Settings, Trash2, Edit2, Check, X, ShieldAlert, Users, Info, Building2, Sliders, Save, ArrowRight, UserCircle, DollarSign} from 'lucide-react';
import { PageHeader } from '../../../components/ui/Shared';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { toast } from 'react-hot-toast';
import { ASSET_DEFINITIONS } from '../../../config/assetsDefinitions';
import { APP_VERSION } from '../../../constants';
import AssetListEditor from '../../assets/components/AssetListEditor';
import EquipeEditor from '../../assets/components/EquipeEditor';
import PermissionsEditor from '../components/PermissionsEditor';
import ParametrosEditor from '../components/ParametrosEditor';
import FazendaPerfilEditor from '../../assets/components/FazendaPerfilEditor';
import MinhaContaEditor from '../components/MinhaContaEditor';

export default function ConfiguracoesScreen({ initialTab }: { initialTab?: string }) {
    const { state, logout, dispatch, setTela, genericUpdate } = useAppContext();
    const { userRole, fazendaNome, permissions } = state;
    const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
    
    // Suporte a deep-link: 'listas:maquinas' ou 'parametros'
    const [initialView, initialAsset] = initialTab ? initialTab.split(':') : ['menu', null];
    const [view, setView] = useState(initialView); 
    const [activeAsset, setActiveAsset] = useState<string | null>(initialAsset);

    // Sincroniza estado interno se o 'initialTab' mudar externamente (ex: pelo checklist)
    // E garante que a página comece no topo ao trocar de aba
    React.useEffect(() => {
        const [v, a] = initialTab ? initialTab.split(':') : ['menu', null];
        setView(v);
        setActiveAsset(a);
        
        // Reset manual do scroll para garantir que abra no topo
        window.scrollTo(0, 0);
        const main = document.querySelector('main');
        if (main) main.scrollTop = 0;
    }, [initialTab]);

    // Reset de scroll também quando mudar a view internamente
    React.useEffect(() => {
        window.scrollTo(0, 0);
        const main = document.querySelector('main');
        if (main) main.scrollTop = 0;
    }, [view, activeAsset]);

    // Ordens de exibição (Unificadas)


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

    // Auxiliar para garantir que o Tailwind gere as classes de hover para todas as cores
    const getColorClasses = (color: string) => {
        const classes: any = {
            red: "bg-red-50 text-red-600 group-hover:bg-red-600",
            green: "bg-green-50 text-green-600 group-hover:bg-green-600",
            orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-600",
            blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600",
            cyan: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600",
            yellow: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-600",
            emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600",
            purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-600",
        };
        return classes[color] || "bg-gray-50 text-gray-600 group-hover:bg-gray-600";
    };

    // 2. TELA DE LISTAS (UNIFICADA E CATEGORIZADA)
    if (view === 'listas') {
        const categories = [
            {
                title: "Módulo Refeição",
                color: "text-orange-600",
                barColor: "bg-orange-500",
                items: ['tiposRefeicao', 'setores']
            },
            {
                title: "Módulo Abastecimento & Manutenção",
                color: "text-red-700",
                barColor: "bg-red-600",
                items: ['maquinas', 'produtosManutencao']
            },
            {
                title: "Módulo Recomendações & Campo",
                color: "text-green-700",
                barColor: "bg-green-600",
                items: ['safras', 'culturas', 'talhoes', 'operacoesAgricolas', 'classes', 'produtos']
            },
            {
                title: "Módulo Monitoramento & Outros",
                color: "text-blue-700",
                barColor: "bg-blue-600",
                items: ['tiposDocumento', 'locaisEnergia', 'locaisChuva']
            },
            {
                title: "Recursos Humanos & Equipe",
                color: "text-indigo-700",
                barColor: "bg-indigo-600",
                items: ['colaboradores']
            }
        ];

        return (
            <EditorContainer title="Cadastros & Listas" icon={ListPlus} color="bg-indigo-600" onBack={() => setView('menu')}>
                <div className="space-y-8">
                    {categories.map((cat, idx) => (
                        <div key={idx} className="space-y-3">
                            <div className="flex items-center gap-2 px-1 border-b border-gray-100 pb-2">
                                <div className={`w-1 h-4 rounded-full ${cat.barColor}`}></div>
                                <h2 className={`text-xs font-black uppercase tracking-widest ${cat.color}`}>{cat.title}</h2>
                            </div>

                            <div className="space-y-2">
                                {cat.items.map((key: string) => {
                                    const def: any = ASSET_DEFINITIONS[key];
                                    if (!def) return null;
                                    
                                    return (
                                        <div 
                                            key={key} 
                                            className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 group hover:border-indigo-200 transition-all active:scale-95 cursor-pointer"
                                            onClick={() => handleOpenEditor(key)}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${getColorClasses(def.color)} group-hover:text-white`}>
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
                    ))}
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
                <ParametrosEditor 
                    currentParams={{
                        ...state.ativos.parametros,
                        safras_lista: state.ativos.safras || []
                    }} 
                    onSave={async (newParams: any) => {
                        // 1. Atualiza no Banco (PERSISTENTE)
                        const newConfig = { ...(state.fazendaSelecionada?.config || {}), parametros: newParams };
                        await genericUpdate('fazendas', state.fazendaId, { config: newConfig }, {
                             type: ACTIONS.UPDATE_ATIVOS, 
                             chave: 'parametros', 
                             novaLista: newParams 
                        });
                        
                        toast.success("Configurações salvas na nuvem!");
                        setView('menu');
                    }}
                    onBack={() => setView('menu')} 
                />
            </EditorContainer>
        );
    }

    // 4. MENU PRINCIPAL DE CONFIGURAÇÕES
    return (
        <div className="space-y-6 p-4 pb-24 max-w-md mx-auto min-h-screen bg-gray-50/50">
            <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-800" backTarget={'principal'} />

            {/* Perfil do Usuário */}
            {/* Setor de Pessoas */}
            {(rolePermissions?.actions?.config_equipe !== false || true) && (
                <div className="space-y-3">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Setor de Pessoas</h2>
                    <MenuButton 
                        icon={UserCircle} 
                        title="Minha Conta" 
                        desc="Meus dados, CNH e segurança" 
                        onClick={() => setView('conta')} 
                        color="bg-indigo-50"
                    />
                    {rolePermissions?.actions?.config_equipe !== false && (
                        <MenuButton 
                            icon={Users} 
                            title="Gestão de Equipe" 
                            desc="Membros e Convites de Acesso" 
                            onClick={() => setView('equipe')} 
                            color="bg-orange-50"
                        />
                    )}
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
            )}

            {rolePermissions?.actions?.config_propriedade !== false && (
                <div className="space-y-3">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Setor de Propriedade</h2>
                    <MenuButton 
                        icon={Building2} 
                        title="Minha Fazenda" 
                        desc={fazendaNome || "Dados da propriedade"} 
                        onClick={() => setView('fazenda')} 
                        color="bg-blue-50"
                    />
                    <MenuButton 
                        icon={ListPlus} 
                        title="Cadastros & Listas" 
                        desc="Máquinas, Talhões, Safras, Produtos, etc." 
                        onClick={() => setView('listas')} 
                        color="bg-indigo-50"
                    />
                </div>
            )}

            {/* Avançado */}
            {rolePermissions?.actions?.config_sistema !== false && (
                <div className="space-y-3">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Sistema & Safra</h2>
                    <MenuButton 
                        icon={Sliders} 
                        title="Parâmetros Gerais" 
                        desc="Safra Ativa, Energia, Diesel e Manutenção" 
                        onClick={() => setView('parametros')} 
                        color="bg-teal-50"
                    />
                </div>
            )}

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
