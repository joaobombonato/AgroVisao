import React from 'react';
import { Utensils, Fuel, Leaf, FolderOpen, Zap, CloudRain, Home, AlertTriangle, Wrench, ShoppingBag, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function PrincipalScreen() {
  const { setTela, nivelCritico } = useAppContext(); // Importamos nivelCritico
  
  const menus = [
    { id: 'refeicoes', nome: 'Refeições', icon: Utensils, cor: 'bg-orange-500' },
    { id: 'abastecimento', nome: 'Abastecimento', icon: Fuel, cor: 'bg-red-500' },
    { id: 'recomendacoes', nome: 'Recomendações', icon: Leaf, cor: 'bg-green-500' },
    { id: 'docs', nome: 'Docs', icon: FolderOpen, cor: 'bg-purple-500', descricao: 'Registro de Documentos' },
    { id: 'energia', nome: 'Energia', icon: Zap, cor: 'bg-yellow-500', descricao: 'Registro de leitura elétrica' },
    { id: 'chuvas', nome: 'Chuvas', icon: CloudRain, cor: 'bg-cyan-500', descricao: 'Registro de chuvas' }, 
    { id: 'manutencao', nome: 'Manutenção', icon: Wrench, cor: 'bg-red-600' },
    { id: 'estoque', nome: 'Estoque', icon: ShoppingBag, cor: 'bg-blue-600' },
    { id: 'relatorios', nome: 'Relatórios', icon: FileText, cor: 'bg-indigo-700' },
  ];

  return (
    <div className="space-y-5 p-4 pb-24">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-gray-100">
        <Home className="w-7 h-7 text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-800">Módulos Operacionais</h1>
      </div>
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
    </div>
  );
}