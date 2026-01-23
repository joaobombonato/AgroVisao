import React from 'react';
import { Utensils, Fuel, Leaf, FolderOpen, Zap, CloudRain, Home, AlertTriangle, Wrench, ShoppingBag, FileText, Settings, Tractor, ArrowRight, MapPinned } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import WeatherMiniWidget from '../components/weather/WeatherMiniWidget';

export default function PrincipalScreen() {
  const { setTela, nivelCritico, ativos, fazendaSelecionada } = useAppContext();
  
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
  ];

  return (
    <div className="space-y-5 p-4 pb-24">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-gray-100">
        <Home className="w-7 h-7 text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-800">Módulos Operacionais</h1>
      </div>

      {isNovaFazenda && (
        <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-5 text-white shadow-xl animate-in zoom-in duration-500">
           <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg shrink-0">
                 <Settings className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div className="flex-1">
                 <h2 className="text-lg font-bold mb-1">Quase lá! 🚀</h2>
                 <p className="text-sm text-green-50 leading-relaxed mb-4">
                    Sua propriedade foi criada, mas ainda está vazia. Comece cadastrando suas <b>máquinas, talhões, centros de custo, medidores de energia, estações meteorológicas e muito mais</b> nas configurações.
                 </p>
                 <button 
                  onClick={() => setTela('config')}
                  className="w-full bg-white text-green-700 font-bold py-2.5 rounded-xl shadow-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                 >
                    Configurar Propriedade <ArrowRight className="w-5 h-5" />
                 </button>
              </div>
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
