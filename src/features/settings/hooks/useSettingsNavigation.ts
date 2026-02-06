import { useState, useEffect } from 'react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { SettingsView } from '../types';

export function useSettingsNavigation(initialTab?: string) {
    const { state, logout, dispatch, setTela, genericUpdate } = useAppContext();
    const { userRole, fazendaNome, permissions } = state;
    const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];

    // Suporte a deep-link: 'listas:maquinas' ou 'parametros'
    const [initialView, initialAsset] = initialTab ? initialTab.split(':') : ['menu', null];
    const [view, setView] = useState<SettingsView>(initialView as SettingsView); 
    const [activeAsset, setActiveAsset] = useState<string | null>(initialAsset);

    // Sincroniza estado interno se o 'initialTab' mudar externamente
    useEffect(() => {
        const [v, a] = initialTab ? initialTab.split(':') : ['menu', null];
        setView(v as SettingsView);
        setActiveAsset(a);
        
        scrollToTop();
    }, [initialTab]);

    // Reset de scroll também quando mudar a view internamente
    useEffect(() => {
        scrollToTop();
    }, [view, activeAsset]);

    const scrollToTop = () => {
        window.scrollTo(0, 0);
        const main = document.querySelector('main');
        if (main) main.scrollTop = 0;
    };

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

    return {
        view,
        setView,
        activeAsset,
        setActiveAsset,
        handleOpenEditor,
        handleLogout,
        setTela,
        state,
        rolePermissions,
        userRole,
        fazendaNome,
        genericUpdate,
        dispatch
    };
}
