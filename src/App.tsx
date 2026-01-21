import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Home, Settings, FileCog, ChartNoAxesCombined, Loader2, Bell, CloudRain, Tractor, LogOut, Check } from 'lucide-react';
import { useAppContext, ACTIONS, AppProvider } from './context/AppContext'; 
import { GlobalStyles, ConfirmModal, OSDetailsModal } from './components/ui/Shared';
import ReloadPrompt from './components/ReloadPrompt';

// -- [Lazy Imports] --
const DashboardScreen = React.lazy(() => import('./screens/DashboardScreen'));
const RefeicoesScreen = React.lazy(() => import('./screens/RefeicoesScreen'));
const AbastecimentoScreen = React.lazy(() => import('./screens/AbastecimentoScreen'));
const RecomendacoesScreen = React.lazy(() => import('./screens/RecomendacoesScreen'));
const DocumentosScreen = React.lazy(() => import('./screens/DocumentosScreen'));
const EnergiaScreen = React.lazy(() => import('./screens/EnergiaScreen'));
const ChuvasScreen = React.lazy(() => import('./screens/ChuvasScreen'));
const OsScreen = React.lazy(() => import('./screens/OsScreen'));
const GraficosScreen = React.lazy(() => import('./screens/GraficosScreen'));
const ConfiguracoesScreen = React.lazy(() => import('./screens/ConfiguracoesScreen'));
const ManutencaoScreen = React.lazy(() => import('./screens/ManutencaoScreen'));
const EstoqueScreen = React.lazy(() => import('./screens/EstoqueScreen'));
const RelatoriosScreen = React.lazy(() => import('./screens/RelatoriosScreen'));
const PrincipalScreen = React.lazy(() => import('./screens/PrincipalScreen'));
const MapScreen = React.lazy(() => import('./screens/MapScreen'));

// Telas de Auth e Onboarding
const AuthScreen = React.lazy(() => import('./screens/AuthScreen'));
const FazendaSelectionScreen = React.lazy(() => import('./screens/FazendaSelectionScreen'));
const CreateFazendaScreen = React.lazy(() => import('./screens/CreateFazendaScreen'));

// -- [MainLayout: Layout para usuários logados com fazenda selecionada] --
const MainLayout = () => {
  const { tela, setTela, modal, selectedOS, os, dispatch, fazendaSelecionada, genericUpdate, isOnline, logout, trocarFazenda } = useAppContext();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showTrocarModal, setShowTrocarModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false); 
  
  const pendentes = (os || []).filter((o:any) => o.status === 'Pendente').length;

  const Screens: any = { 
    principal: PrincipalScreen, 
    dashboard: DashboardScreen, 
    graficos: GraficosScreen, 
    config: ConfiguracoesScreen, 
    refeicoes: RefeicoesScreen, 
    abastecimento: AbastecimentoScreen, 
    recomendacoes: RecomendacoesScreen, 
    docs: DocumentosScreen, 
    energia: EnergiaScreen, 
    chuvas: ChuvasScreen, 
    os: OsScreen,
    manutencao: ManutencaoScreen,
    estoque: EstoqueScreen,
    relatorios: RelatoriosScreen,
    mapa: MapScreen
  };

  const [screenId, subTab] = tela.split(':');
  const ScreenComponent = Screens[screenId] || PrincipalScreen;
  
  const menusRodape = [
    { id: 'principal', nome: 'Principal', icon: Home, activeColor: 'text-blue-600', activeBg: 'bg-blue-600', iconColor: 'text-white' }, 
    { id: 'dashboard', nome: 'Dashboard', icon: FileCog, activeColor: 'text-yellow-500', activeBg: 'bg-yellow-500', iconColor: 'text-white' }, 
    { id: 'graficos', nome: 'Gráficos', icon: ChartNoAxesCombined, activeColor: 'text-purple-600', activeBg: 'bg-purple-600', iconColor: 'text-white' }, 
    { id: 'config', nome: 'Config.', icon: Settings, activeColor: 'text-gray-700', activeBg: 'bg-gray-700', iconColor: 'text-white' }
  ];

  // PWA Install Prompt
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
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') toast.success("Instalação iniciada!");
      setDeferredPrompt(null);
    }
  };

  const irParaNotificacoes = () => setTela('os');

  // Funções de navegação auxiliares


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* <GlobalStyles /> */}
        <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between max-w-md mx-auto w-full"> 
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
                   {fazendaSelecionada?.config?.logo_base64 ? (
                       <img src={fazendaSelecionada.config.logo_base64} alt="Logo" className="w-full h-full object-contain" />
                   ) : (
                       <img src="/icon.png" alt="Logo" className="w-full h-full object-contain" />
                   )}
                </div>
                <div className="min-w-0">
                    <h1 className="text-base font-bold text-gray-800 truncate">
                        {fazendaSelecionada?.nome || 'AgroVisão'}
                    </h1>
                    <p className="text-xs text-gray-600 truncate font-medium">AgroVisão v3.6</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOnline ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`} title={isOnline ? 'Online' : 'Offline'}>
                   <Check className="w-5 h-5" strokeWidth={3} />
               </div>
               <button onClick={irParaNotificacoes} className="p-2 text-gray-400 hover:text-gray-600 relative" title="Notificações">
                  <Bell className="w-6 h-6" />
                  {pendentes > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />}
               </button>
               <button 
                  onClick={() => setShowTrocarModal(true)} 
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                  title="Trocar Fazenda"
               >
                   <Tractor className="w-6 h-6" />
               </button>
               <button 
                  onClick={() => setShowLogoutModal(true)} 
                  className="flex items-center gap-1 px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg font-bold text-sm"
                  title="Sair do Sistema"
               >
                   <LogOut className="w-5 h-5" />
                   <span className="hidden xs:inline">Sair</span>
               </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 scroll-smooth">
             <div className="max-w-md mx-auto w-full">
                <React.Suspense fallback={
                    <div className="flex items-center justify-center h-64">
                         <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                    </div>
                }>
                    <ScreenComponent initialTab={subTab} />
                </React.Suspense>
             </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
           <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
              {menusRodape.map(menu => {
                  const isActive = tela === menu.id;
                  const Icon = menu.icon;
                  // As cores agora são explícitas para o Tailwind detectar
                  
                  return (
                      <button 
                        key={menu.id}
                        onClick={() => setTela(menu.id)}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 ${isActive ? `${menu.activeColor} -translate-y-1` : 'text-gray-400 hover:text-gray-600'}`}
                      >
                          <div className={`px-4 py-1.5 rounded-xl transition-all ${isActive ? `${menu.activeBg} ${menu.iconColor}` : 'bg-transparent'}`}>
                             <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                          </div>
                          <span className="text-[10px] font-bold">{menu.nome}</span>
                      </button>
                  )
              })}
           </div>
        </nav>

        {modal.open && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              {modal.type === 'confirm' && <ConfirmModal {...modal.props} />}
              {modal.type === 'os-details' && (
                  <OSDetailsModal 
                    os={selectedOS} 
                    onClose={() => dispatch({ type: ACTIONS.CLOSE_MODAL })} 
                    onUpdate={(updatedOS:any) => genericUpdate('manutencoes', updatedOS.id, updatedOS)} 
                  />
              )}
           </div>
        )}

        {/* Trocar Fazenda Modal */}
        <ConfirmModal
          isOpen={showTrocarModal}
          onClose={() => setShowTrocarModal(false)}
          onConfirm={() => trocarFazenda()}
          title="Trocar de Fazenda"
          message="Deseja trocar para outra fazenda? Você será redirecionado para a tela de seleção."
          confirmText="Trocar"
          cancelText="Cancelar"
          variant="info"
          icon="tractor"
        />

        {/* Logout Modal */}
        <ConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={() => logout()}
          title="Sair do Sistema"
          message="Tem certeza que deseja sair? Você precisará fazer login novamente."
          confirmText="Sair"
          cancelText="Cancelar"
          variant="danger"
          icon="logout"
        />
    </div>
  );
};

// -- [AppContent: Gerenciador de Rotas Globais] --
const AppContent = () => {
    const { tela } = useAppContext();

    if (tela === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
                <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                <p className="text-gray-500 font-medium animate-pulse">Iniciando AgroVisão...</p>
            </div>
        );
    }

    if (tela === 'auth') {
        return (
            <React.Suspense fallback={<div className="min-h-screen bg-white" />}>
                <AuthScreen />
            </React.Suspense>
        );
    }

    if (tela === 'fazenda_selection') {
        return (
            <React.Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-green-600"/></div>}>
                <FazendaSelectionScreen />
            </React.Suspense>
        );
    }

    if (tela === 'create_fazenda') {
        return (
            <React.Suspense fallback={<div className="min-h-screen bg-white" />}>
                <CreateFazendaScreen />
            </React.Suspense>
        );
    }

    // Default: App Logado
    return <MainLayout />;
};

// -- [Root Component] --
export default function App() {
  return (
    <AppProvider> 
      <Toaster position="top-center" reverseOrder={false} />
      <ReloadPrompt />
      <AppContent />
    </AppProvider>
  );
}