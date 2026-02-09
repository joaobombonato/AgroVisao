import React from 'react';
import { Utensils, Fuel, Leaf, FolderOpen, Zap, CloudRain, Home, AlertTriangle, Wrench, ShoppingBag, FileText, Settings, Tractor, ArrowRight, MapPinned, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import WeatherMiniWidget from '../features/weather/components/WeatherMiniWidget';

export default function PrincipalScreen() {
  const { state, setTela, nivelCritico, ativos, fazendaSelecionada } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
  
  // Verifica se a fazenda é nova (sem máquinas cadastradas)
  const isNovaFazenda = !ativos?.maquinas || ativos.maquinas.length === 0;
  const menus = [
    { id: 'refeicoes', nome: 'Refeições', icon: Utensils, cor: 'bg-orange-500', descricao: 'Registro de Refeições' },
    { id: 'abastecimento', nome: 'Abastecimento', icon: Fuel, cor: 'bg-red-500', descricao: 'Registro de Consumo & Estoque' },
    { id: 'recomendacoes', nome: 'Recomendações', icon: Leaf, cor: 'bg-green-500', descricao: 'Registro de Recomendações' },
    { id: 'manutencao', nome: 'Manutenção', icon: Wrench, cor: 'bg-red-600', descricao: 'Controle de Manutenção' },
    { id: 'estoque', nome: 'Estoque', icon: ShoppingBag, cor: 'bg-blue-600', descricao: 'Controle de Estoque' },
    { id: 'docs', nome: 'Docs', icon: FolderOpen, cor: 'bg-purple-500', descricao: 'Registro de Documentos' },
    { id: 'energia', nome: 'Energia', icon: Zap, cor: 'bg-yellow-400', descricao: 'Registro de leitura elétrica' },
    { id: 'chuvas:previsao', nome: 'Chuvas e Previsão', icon: CloudRain, cor: 'bg-cyan-500', descricao: 'Registro de Chuvas e Previsão Multi-Fonte' }, 
    { id: 'mapa', nome: 'Mapas e Satélite', icon: MapPinned, cor: 'bg-green-700', descricao: 'Satélite & Área' },
    { id: 'relatorios', nome: 'Relatórios', icon: FileText, cor: 'bg-indigo-700', descricao: 'Relatórios Diversos' },
  ].filter(m => {
    const screenId = m.id.split(':')[0];
    if (rolePermissions?.screens?.[screenId] === false) return false;
    return true;
  });

  return (
    <div className="space-y-5 p-4 pb-24">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-gray-100">
        <Home className="w-7 h-7 text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-800">Módulos Operacionais</h1>
      </div>

      {/* Sistema de Passos de Boas-vindas (Checklist Dinâmico) */}
      {(isNovaFazenda || !ativos?.talhoes?.length || !ativos?.parametros?.financeiro?.precoDiesel || !state.userProfile?.full_name || !state.ativos?.locais?.length || !state.ativos?.pontosEnergia?.length) && (
        <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-6 shadow-xl animate-in zoom-in duration-500 overflow-hidden relative">
           {/* Detalhe de luz suave no fundo */}
           <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
           
           <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/10 shrink-0">
                 <Settings className="w-7 h-7 text-white animate-spin" />
              </div>
              <div>
                 <h2 className="text-xl font-black text-white tracking-tight">AgroVisão Onboarding 🚀</h2>
                 <p className="text-[10px] text-green-100 uppercase font-bold tracking-[0.2em] opacity-80">Guia de Configuração Inicial</p>
              </div>
           </div>

           <div className="space-y-3 relative z-10">
              {/* PASSO 1: PERFIL DO USUÁRIO */}
              <button 
                onClick={() => setTela('config:conta')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${state.userProfile?.full_name ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm'}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${state.userProfile?.full_name ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                       {state.userProfile?.full_name ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">1</span>}
                    </div>
                    <div className="text-left">
                       <p className={`text-sm font-bold ${state.userProfile?.full_name ? 'text-green-700' : 'text-gray-700'}`}>Perfil do Usuário</p>
                       <p className="text-[10px] text-gray-400">Complete seu cadastro e assinatura</p>
                    </div>
                 </div>
                 {!state.userProfile?.full_name && <ArrowRight className="w-4 h-4 text-blue-500" />}
              </button>

              {/* PASSO 2: PERÍMETRO DA FAZENDA */}
              <button 
                onClick={() => setTela('mapa')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${fazendaSelecionada?.geojson ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm'}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${fazendaSelecionada?.geojson ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                       {fazendaSelecionada?.geojson ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">2</span>}
                    </div>
                    <div className="text-left">
                       <p className={`text-sm font-bold ${fazendaSelecionada?.geojson ? 'text-green-700' : 'text-gray-700'}`}>Perímetro da Fazenda</p>
                       <p className="text-[10px] text-gray-400">Defina os limites e áreas da propriedade</p>
                    </div>
                 </div>
                 {!fazendaSelecionada?.geojson && <ArrowRight className="w-4 h-4 text-blue-500" />}
              </button>

              {/* PASSO 3: PARÂMETROS GERAIS */}
              <button 
                onClick={() => setTela('config:parametros')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${ativos?.parametros?.financeiro?.precoDiesel ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm'}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ativos?.parametros?.financeiro?.precoDiesel ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                       {ativos?.parametros?.financeiro?.precoDiesel ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">3</span>}
                    </div>
                    <div className="text-left">
                       <p className={`text-sm font-bold ${ativos?.parametros?.financeiro?.precoDiesel ? 'text-green-700' : 'text-gray-700'}`}>Parâmetros Gerais</p>
                       <p className="text-[10px] text-gray-400">Energia elétrica, abastecimento e manutenção</p>
                    </div>
                 </div>
                 {!ativos?.parametros?.financeiro?.precoDiesel && <ArrowRight className="w-4 h-4 text-blue-500" />}
              </button>

              {/* PASSO 4: FROTA DE MAQUINÁRIO */}
              <button 
                onClick={() => setTela('config:editor:maquinas')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${ativos?.maquinas?.length > 0 ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm'}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ativos?.maquinas?.length > 0 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                       {ativos?.maquinas?.length > 0 ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">4</span>}
                    </div>
                    <div className="text-left">
                       <p className={`text-sm font-bold ${ativos?.maquinas?.length > 0 ? 'text-green-700' : 'text-gray-700'}`}>Frota de Maquinário</p>
                       <p className="text-[10px] text-gray-400">Cadastre seus tratores e implementos</p>
                    </div>
                 </div>
                 {!(ativos?.maquinas?.length > 0) && <ArrowRight className="w-4 h-4 text-blue-500" />}
              </button>

              {/* PASSO 5: CADASTROS OPERACIONAIS (TALHÕES) */}
              <button 
                onClick={() => setTela('config:editor:talhoes')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${ativos?.talhoes?.length > 0 ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm'}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ativos?.talhoes?.length > 0 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                       {ativos?.talhoes?.length > 0 ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">5</span>}
                    </div>
                    <div className="text-left">
                       <p className={`text-sm font-bold ${ativos?.talhoes?.length > 0 ? 'text-green-700' : 'text-gray-700'}`}>Cadastros Operacionais</p>
                       <p className="text-[10px] text-gray-400">Talhões, Safras e Centros de Custo</p>
                    </div>
                 </div>
                 {!(ativos?.talhoes?.length > 0) && <ArrowRight className="w-4 h-4 text-blue-500" />}
              </button>

              {/* PASSO 6: MEDIDORES DE ENERGIA */}
              <button 
                onClick={() => setTela('config:editor:locaisEnergia')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${ativos?.pontosEnergia?.length > 0 ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm'}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ativos?.pontosEnergia?.length > 0 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                       {ativos?.pontosEnergia?.length > 0 ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">6</span>}
                    </div>
                    <div className="text-left">
                       <p className={`text-sm font-bold ${ativos?.pontosEnergia?.length > 0 ? 'text-green-700' : 'text-gray-700'}`}>Medidores de Energia</p>
                       <p className="text-[10px] text-gray-400">Cadastre os pontos de medição elétrica</p>
                    </div>
                 </div>
                 {!(ativos?.pontosEnergia?.length > 0) && <ArrowRight className="w-4 h-4 text-blue-500" />}
              </button>

              {/* PASSO 7: ESTAÇÕES DE CHUVA */}
              <button 
                onClick={() => setTela('config:editor:locaisChuva')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${ativos?.locais?.length > 0 ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm'}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ativos?.locais?.length > 0 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                       {ativos?.locais?.length > 0 ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">7</span>}
                    </div>
                    <div className="text-left">
                       <p className={`text-sm font-bold ${ativos?.locais?.length > 0 ? 'text-green-700' : 'text-gray-700'}`}>Local (Pluviômetro)</p>
                       <p className="text-[10px] text-gray-400">Cadastre seus pluviômetros</p>
                    </div>
                 </div>
                 {!(ativos?.locais?.length > 0) && <ArrowRight className="w-4 h-4 text-blue-500" />}
              </button>

              {/* PASSO 8: GESTÃO DE EQUIPE & PERMISSÕES */}
              <button 
                onClick={() => setTela('config:equipe')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${state.dbAssets?.fazenda_membros?.length > 1 ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm'}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${state.dbAssets?.fazenda_membros?.length > 1 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                       {state.dbAssets?.fazenda_membros?.length > 1 ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">8</span>}
                    </div>
                    <div className="text-left">
                       <p className={`text-sm font-bold ${state.dbAssets?.fazenda_membros?.length > 1 ? 'text-green-700' : 'text-gray-700'}`}>Gestão de Equipe & Permissões</p>
                       <p className="text-[10px] text-gray-400">Convide seu time e ajuste acessos</p>
                    </div>
                 </div>
                 {!(state.dbAssets?.fazenda_membros?.length > 1) && <ArrowRight className="w-4 h-4 text-blue-500" />}
              </button>
           </div>
        </div>
      )}

      {fazendaSelecionada?.latitude && fazendaSelecionada?.longitude && (
        <div className="animate-in slide-in-from-top duration-700">
          <WeatherMiniWidget 
            latitude={fazendaSelecionada.latitude} 
            longitude={fazendaSelecionada.longitude} 
            farmName={fazendaSelecionada.nome}
            onClick={() => setTela('chuvas:previsao')}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 pt-2">
        {menus.map(menu => {
          const Icon = menu.icon;
          const isCritical = menu.id === 'abastecimento' && nivelCritico; // Verifica se é Abastecimento e se está crítico
          
          return (
            <button key={menu.id} onClick={() => setTela(menu.id)} className={`relative flex flex-col items-center justify-center p-4 rounded-xl shadow-lg ${menu.cor} text-white hover:opacity-90 active:scale-95 transition-all aspect-square`}>
              {isCritical && (
                 // Alerta Visual de Estoque Baixo
                 <div className="absolute top-1 right-1 p-1 bg-yellow-400 rounded-full animate-bounce z-10">
                     <AlertTriangle className="w-4 h-4 text-red-700"/>
                 </div>
              )}
              <Icon className="w-8 h-8 mb-2" /><span className="text-xs font-bold text-center leading-tight">{menu.nome}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center justify-center opacity-80">
         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Desenvolvido por</span>
         <img 
            src="/marca-praticoapp.png" 
            alt="PraticoAPP" 
            className="h-20 object-contain hover:scale-105 transition-transform cursor-pointer" 
            onClick={() => window.open('https://praticoapp.com.br', '_blank')}
         />
      </div>
    </div>
  );
}
