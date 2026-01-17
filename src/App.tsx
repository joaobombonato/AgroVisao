import React, { useReducer, useEffect, useContext, useMemo, useState, createContext, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Home, Droplet, Zap, FolderOpen, Fuel, Leaf, Utensils, Bell, Settings, TrendingUp, Trash2, Check, X, Plus, X as XClose, Minus, Tractor, FileCog, ChartNoAxesCombined, Loader2, LogOut, ArrowRight, CloudRain } from 'lucide-react';
// IMPORTAÇÕES ESSENCIAIS DO CONTEXTO
import { useAppContext, ACTIONS, AppProvider } from './context/AppContext'; 
import { U } from './data/utils';
import { ATIVOS_INICIAIS, DADOS_INICIAIS } from './data/constants';
// Seus imports de telas e componentes de UI
import { GlobalStyles, ConfirmModal, OSDetailsModal } from './components/ui/Shared';
import ReloadPrompt from './components/ReloadPrompt';
import PrincipalScreen from './screens/PrincipalScreen';
// ... (existing imports)

// ... (existing code)

// [3] Entry Point Final: Garante o Provider e o Toaster

import DashboardScreen from './screens/DashboardScreen';
import RefeicoesScreen from './screens/RefeicoesScreen';
import AbastecimentoScreen from './screens/AbastecimentoScreen';
import RecomendacoesScreen from './screens/RecomendacoesScreen';
import DocumentosScreen from './screens/DocumentosScreen';
import EnergiaScreen from './screens/EnergiaScreen';
import ChuvasScreen from './screens/ChuvasScreen';
import OsScreen from './screens/OsScreen';
import GraficosScreen from './screens/GraficosScreen';
import ConfiguracoesScreen from './screens/ConfiguracoesScreen';
import AuthScreen from './screens/AuthScreen';


// [1] O componente MainLayout (Layout principal, SÓ PODE SER USADO QUANDO LOGADO)
const MainLayout = () => {
  // Importando fazendaNome do contexto para o cabeçalho
  // Importando genericUpdate
  const { tela, setTela, loading, modal, selectedOS, os, dispatch, logout, session, fazendaNome, genericUpdate } = useAppContext();
  const [deferredPrompt, setDeferredPrompt] = useState(null); 
  
  const pendentes = (os || []).filter((o:any) => o.status === 'Pendente').length;

  const Screens: any = { 
    principal: PrincipalScreen, dashboard: DashboardScreen, graficos: GraficosScreen, config: ConfiguracoesScreen, refeicoes: RefeicoesScreen, abastecimento: AbastecimentoScreen, recomendacoes: RecomendacoesScreen, docs: DocumentosScreen, energia: EnergiaScreen, chuvas: ChuvasScreen, os: OsScreen 
  };

  const ScreenComponent = Screens[tela] || PrincipalScreen;
  
  const menusRodape = [
    { id: 'principal', nome: 'Principal', icon: Home, cor: 'bg-blue-500' }, 
    { id: 'dashboard', nome: 'Dashboard', icon: FileCog, cor: 'bg-indigo-600' }, 
    { id: 'graficos', nome: 'Gráficos', icon: ChartNoAxesCombined, cor: 'bg-gradient-to-r from-purple-500 to-pink-500' }, 
    { id: 'config', nome: 'Config.', icon: Settings, cor: 'bg-gray-600' }
  ];

  // Lógica para capturar o evento de instalação PWA (Mantida)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e:any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      const { outcome } = await (deferredPrompt as any).userChoice;
      if (outcome === 'accepted') {
        toast.success("App Fazenda SC instalado com sucesso!");
      }
      setDeferredPrompt(null);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* <GlobalStyles /> */}
        <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50">
          {/* Usando o nome da fazenda do Contexto */}
          <div className="px-4 py-3 flex items-center justify-between max-w-md mx-auto w-full"> 
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <Tractor className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-base font-bold text-gray-800 truncate">{fazendaNome || 'Carregando...'}</h1>
                    <p className="text-xs text-gray-600 truncate">AgroDev v3.4</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
              {/* SYNC INDICATOR */}
              <div className="flex items-center">
                  {(os || []).length > 0 && modal && !loading ? (
                       <div className="flex flex-col items-end mr-2">
                           {/* Monitorando syncQueue do Contexto? Precisamos expor no hook. */}
                           {/* O hook useAppContext retorna ...state, que inclui syncQueue */}
                       </div>
                  ) : null}
                  {/* Como não desestruturei syncQueue no App.tsx, vou adicionar agora */}
              </div>

               {/* RE-IMPLEMENTANDO BOTAO DE OS E SYNC JUNTOS */}
               {(() => {
                   // Acesso direto ao state via useAppContext (já desestruturado em MainLayout, preciso incluir syncQueue)
                   // Vou assumir que vou adicionar syncQueue na desestruturação na próxima ferramenta, 
                   // mas aqui vou usar uma lógica inline se possível ou placeholders.
                   // Melhor fazer direito: Adicionar syncQueue na desestruturação primeiro.
                   return null; 
               })()}
            </div>
            <div className="flex items-center gap-2">
               {/* SYNC STATUS ICON */}
               {(() => {
                   // @ts-ignore
                   const queueLength = (useAppContext().syncQueue || []).length;
                   const hasPending = queueLength > 0;
                   return (
                       <div className={`flex items-center justify-center w-8 h-8 rounded-full ${hasPending ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-green-100 text-green-600'}`} title={hasPending ? `${queueLength} pendentes` : "Sincronizado"}>
                           {hasPending ? <CloudRain className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                       </div>
                   );
               })()}

              {tela !== 'os' && (<button onClick={() => setTela('os')} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"><Bell className="w-5 h-5 text-gray-600" />{pendentes > 0 && (<span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{pendentes}</span>)}</button>)}
              {/* Botão de Limpar/Logout */}
              {session ? (
                  <button onClick={() => dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Deseja realmente sair do sistema?', onConfirm: () => { logout(); } } })} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded font-medium flex items-center gap-1">
                      <LogOut className="w-4 h-4"/> Sair
                  </button>
              ) : (
                  <button onClick={() => dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Limpar dados locais (MVP)?', onConfirm: () => { localStorage.clear(); window.location.reload(); } } })} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded font-medium flex items-center gap-1">
                      <Trash2 className="w-4 h-4"/> Limpar
                  </button>
              )}
            </div>
          </div>
        </header>

        {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><p className="mt-4 font-medium">Carregando dados...</p></div>
        ) : (
            <div className="flex-1 overflow-y-auto no-scrollbar max-w-md mx-auto w-full">
                <ScreenComponent />
            </div>
        )}
        
        {modal.isOpen && (<ConfirmModal message={modal.message} onConfirm={() => { modal.onConfirm(); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); }} onClose={() => dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } })} />)}
        
        {/* OFFLINE-FIRST OS UPDATE */}
        {selectedOS && (
            <OSDetailsModal 
                os={selectedOS} 
                onClose={() => dispatch({ type: ACTIONS.SET_SELECTED_OS, os: null })} 
                onUpdateStatus={(id: string, status: string) => {
                    // Usa genericUpdate para atualizar DB e Fila se offline
                    genericUpdate('os', id, { status }, { type: ACTIONS.UPDATE_OS_STATUS, id, status });
                }} 
            />
        )}
        
        {/* Botão de Instalação PWA */}
        {deferredPrompt && (
          <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center p-2">
            <button onClick={handleInstallClick} className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 hover:bg-green-700 transition-colors">
              <Plus className="w-5 h-5"/> Instalar App Fazenda SC
            </button>
          </div>
        )}

        {/* Barra de Navegação */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 z-50">
          <div className="grid grid-cols-4 gap-1 p-2 max-w-md mx-auto"> 
            {menusRodape.map(menu => {
              const Icon = menu.icon; const ativo = tela === menu.id;
              const activeClass = menu.id === 'graficos' && ativo ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : ativo ? `${menu.cor} text-white` : 'text-gray-600 hover:bg-gray-100';
              return (<button key={menu.id} onClick={() => setTela(menu.id)} className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg ${activeClass}`}><div className="flex items-center justify-center gap-1"><Icon className="w-5 h-5" /></div><span className="text-xs font-medium">{menu.nome}</span></button>);
            })}
          </div>
        </nav>
      </div>
  );
}

// [2] Componente que consome o contexto e faz o roteamento
const AppWrapper = () => {
    const { session, loading } = useAppContext(); 
    let content = null;

    if (loading) {
        content = (<div className="flex-1 flex flex-col items-center justify-center text-gray-500 h-screen"><Loader2 className="w-8 h-8 animate-spin text-green-500" /><p className="mt-4 font-medium">Verificando sessão...</p></div>);
    } else if (!session) {
        content = <AuthScreen />;
    } else {
        content = <MainLayout />;
    }

    return content; 
}

// [3] Entry Point Final: Garante o Provider e o Toaster
export default function App() {
  return (
    <>
        <Toaster position="top-center" /> 
        <AppProvider>
            <AppWrapper />
        </AppProvider>
    </>
  );
}