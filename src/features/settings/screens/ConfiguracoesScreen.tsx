import React from 'react';
import { UserCircle, Users, Shield, Building2, Sliders } from 'lucide-react';
import { ACTIONS } from '../../../context/AppContext';
import { toast } from 'react-hot-toast';
import AssetListEditor from '../../assets/components/AssetListEditor';
import EquipeEditor from '../../assets/components/EquipeEditor';
import PermissionsEditor from '../components/PermissionsEditor';
import ParametrosEditor from '../components/ParametrosEditor';
import FazendaPerfilEditor from '../../farm/components/FazendaPerfilEditor';
import MinhaContaEditor from '../components/MinhaContaEditor';

import { useSettingsNavigation } from '../hooks/useSettingsNavigation';
import SettingsMenu from '../components/SettingsMenu';
import SettingsListas from '../components/SettingsListas';
import { EditorContainer } from '../components/SettingsShared';

export default function ConfiguracoesScreen({ initialTab }: { initialTab?: string }) {
    const nav = useSettingsNavigation(initialTab);

    // 1. TELA DE EDITOR DE ATIVOS (DINÂMICO)
    if (nav.view === 'editor' && nav.activeAsset) {
        return <AssetListEditor assetKey={nav.activeAsset} onBack={() => nav.setView('listas')} />;
    }

    // 2. TELA DE LISTAS (UNIFICADA E CATEGORIZADA)
    if (nav.view === 'listas') {
        return <SettingsListas setView={nav.setView} handleOpenEditor={nav.handleOpenEditor} />;
    }

    // 3. OUTRAS SUB-TELAS
    if (nav.view === 'conta') {
        return (
            <EditorContainer title="Minha Conta" icon={UserCircle} color="bg-indigo-700" onBack={() => nav.setView('menu')}>
                <MinhaContaEditor />
            </EditorContainer>
        );
    }

    if (nav.view === 'equipe') {
        return (
            <EditorContainer title="Gestão de Equipe" icon={Users} color="bg-orange-500" onBack={() => nav.setView('menu')}>
                <EquipeEditor />
            </EditorContainer>
        );
    }

    if (nav.view === 'permissoes') {
        return (
            <EditorContainer title="Permissões" icon={Shield} color="bg-red-600" onBack={() => nav.setView('menu')}>
                <PermissionsEditor />
            </EditorContainer>
        );
    }

    if (nav.view === 'fazenda') {
        return (
            <EditorContainer title="Minha Fazenda" icon={Building2} color="bg-blue-600" onBack={() => nav.setView('menu')}>
                <FazendaPerfilEditor />
            </EditorContainer>
        );
    }

    if (nav.view === 'parametros') {
        return (
            <EditorContainer title="Parâmetros Gerais" icon={Sliders} color="bg-teal-600" onBack={() => nav.setView('menu')}>
                <ParametrosEditor 
                    currentParams={{
                        ...nav.state.ativos.parametros,
                        safras_lista: nav.state.ativos.safras || []
                    }} 
                    onSave={async (newParams: any) => {
                        const newConfig = { ...(nav.state.fazendaSelecionada?.config || {}), parametros: newParams };
                        await nav.genericUpdate('fazendas', nav.state.fazendaId, { config: newConfig }, {
                             type: ACTIONS.UPDATE_ATIVOS, 
                             chave: 'parametros', 
                             novaLista: newParams 
                        });
                        toast.success("Configurações salvas na nuvem!");
                        nav.setView('menu');
                    }}
                    onBack={() => nav.setView('menu')} 
                />
            </EditorContainer>
        );
    }

    // 4. MENU PRINCIPAL
    return (
        <SettingsMenu 
            setTela={nav.setTela}
            setView={nav.setView}
            rolePermissions={nav.rolePermissions}
            userRole={nav.userRole}
            fazendaNome={nav.fazendaNome}
            handleLogout={nav.handleLogout}
        />
    );
}
