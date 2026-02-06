import React from 'react';
import { UserCircle, Users, Shield, Building2, ListPlus, Sliders, LogOut } from 'lucide-react';
import { PageHeader } from '../../../components/ui/Shared';
import { MenuButton } from './SettingsShared';
import { APP_VERSION } from '../../../constants';

interface SettingsMenuProps {
    setTela: (tela: string) => void;
    setView: (view: any) => void;
    rolePermissions: any;
    userRole: string;
    fazendaNome: string;
    handleLogout: () => void;
}

export default function SettingsMenu({ 
    setTela, 
    setView, 
    rolePermissions, 
    userRole, 
    fazendaNome, 
    handleLogout 
}: SettingsMenuProps) {
    return (
        <div className="space-y-6 p-4 pb-24 max-w-md mx-auto min-h-screen bg-gray-50/50">
            <PageHeader setTela={setTela} title="Configurações" icon={Sliders} colorClass="bg-gray-800" backTarget={'principal'} />

            {/* Setor de Pessoas */}
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
