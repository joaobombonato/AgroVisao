import React, { useState } from 'react';
import { Shield, Save, RotateCcw, Monitor, Zap, Check, X, Info, ChevronDown, ChevronRight, FileCog, ChartNoAxesCombined, Settings, Bell, Utensils, Fuel, Leaf, Wrench, ShoppingBag, FolderOpen, CloudRain, MapPinned, FileText } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { DEFAULT_PERMISSIONS } from '../../../data/constants';
import { toast } from 'react-hot-toast';

export default function PermissionsEditor() {
  const { state, dispatch, genericUpdate } = useAppContext();
  const { permissions, userRole } = state;
  
  // Local state to manage edits before saving
  const [localPermissions, setLocalPermissions] = useState(JSON.parse(JSON.stringify(permissions)));
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  if (userRole !== 'Proprietário') {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Apenas o proprietário pode gerenciar permissões.</p>
      </div>
    );
  }

  const handleToggle = (role: string, type: 'screens' | 'actions', key: string) => {
    setLocalPermissions((prev: any) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [type]: {
          ...prev[role][type],
          [key]: !prev[role][type][key]
        }
      }
    }));
  };

  const salvar = async () => {
    try {
      genericUpdate('fazendas', state.fazendaId, { 
        config: { 
          ...state.ativos?.parametros,
          permissions: localPermissions 
        } 
      });

      dispatch({ type: ACTIONS.SET_PERMISSIONS, payload: localPermissions });
      toast.success('Quadro de Comando atualizado!');
    } catch (err) {
      toast.error('Erro ao salvar permissões');
    }
  };

  const restaurarPadrao = () => {
    if (window.confirm('Deseja restaurar todas as permissões para o padrão de fábrica?')) {
      setLocalPermissions(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
      toast.success('Padrões restaurados (clique em salvar para aplicar)');
    }
  };

  const roles = ['Proprietário', 'Gerente', 'Administrativo', 'Operador', 'Consultor Agrícola'];
  
  const screens = [
    { id: 'dashboard', label: 'Dashboard', icon: FileCog, color: 'yellow-600', bg: 'bg-yellow-50/50', border: 'border-yellow-100', text: 'text-yellow-800' },
    { id: 'graficos', label: 'Gráficos', icon: ChartNoAxesCombined, color: 'purple-600', bg: 'bg-purple-50/50', border: 'border-purple-100', text: 'text-purple-800' },
    { id: 'config', label: 'Configurações', icon: Settings, color: 'gray-700', bg: 'bg-gray-50/50', border: 'border-gray-100', text: 'text-gray-800' },
    { id: 'os', label: 'Ordens de Serviço', icon: Bell, color: 'indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-800' },
    { id: 'refeicoes', label: 'Refeições', icon: Utensils, color: 'orange-500', bg: 'bg-orange-50/50', border: 'border-orange-100', text: 'text-orange-800' },
    { id: 'abastecimento', label: 'Abastecimento', icon: Fuel, color: 'red-500', bg: 'bg-red-50/50', border: 'border-red-100', text: 'text-red-800' },
    { id: 'recomendacoes', label: 'Recomendações', icon: Leaf, color: 'green-500', bg: 'bg-green-50/50', border: 'border-green-100', text: 'text-green-800' },
    { id: 'manutencao', label: 'Manutenção', icon: Wrench, color: 'red-600', bg: 'bg-red-50/50', border: 'border-red-100', text: 'text-red-800' },
    { id: 'estoque', label: 'Estoque', icon: ShoppingBag, color: 'blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-800' },
    { id: 'docs', label: 'Documentos', icon: FolderOpen, color: 'purple-500', bg: 'bg-purple-50/50', border: 'border-purple-100', text: 'text-purple-800' },
    { id: 'energia', label: 'Energia', icon: Zap, color: 'yellow-400', bg: 'bg-yellow-50/50', border: 'border-yellow-100', text: 'text-yellow-700' },
    { id: 'chuvas', label: 'Chuvas', icon: CloudRain, color: 'cyan-500', bg: 'bg-cyan-50/50', border: 'border-cyan-100', text: 'text-cyan-800' },
    { id: 'mapa', label: 'Mapas', icon: MapPinned, color: 'green-700', bg: 'bg-green-50/50', border: 'border-green-100', text: 'text-green-900' },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, color: 'indigo-700', bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-800' },
  ];

  const actions = [
    { id: 'abastecimento_compra', label: 'Registrar Compra Diesel' },
    { id: 'estoque_compra', label: 'Registrar Compra Insumos' },
    { id: 'recomendacao_criar', label: 'Criar Nova Recomendação' },
    { id: 'chuvas_registro', label: 'Registrar Lançamento de Chuvas' },
    { id: 'mapa_edicao', label: 'Editar Áreas e Talhões no Mapa' },
    { id: 'excluir_registros', label: 'Excluir Registros do Sistema' },
    { id: 'config_financeiro', label: 'Acesso às Config. Financeiras' },
    { id: 'config_equipe', label: 'Gerenciar Pessoas e Equipe' },
    { id: 'config_propriedade', label: 'Ajustar Dados da Fazenda' },
    { id: 'config_sistema', label: 'Alterar Parâmetros e Safras' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Quadro de Comando</h2>
            <p className="text-xs text-gray-400">Gerencie o acesso de cada cargo</p>
          </div>
        </div>
        <button 
          onClick={restaurarPadrao}
          className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
          title="Restaurar Padrão de Fábrica"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-800 leading-tight">
          As permissões do <b>Proprietário</b> são bloqueadas para garantir que você nunca perca o acesso administrativo.
        </p>
      </div>

      <div className="space-y-3">
          {roles.map(role => {
            const isExpanded = expandedRole === role;
            return (
              <div key={role} className={`bg-white rounded-xl border-2 transition-all ${isExpanded ? 'border-blue-200 shadow-md' : 'border-gray-100 shadow-sm'}`}>
                <button 
                    onClick={() => setExpandedRole(isExpanded ? null : role)}
                    className="w-full bg-gray-50/50 px-4 py-3 flex items-center justify-between hover:bg-gray-100/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <h3 className="font-bold text-gray-700 uppercase tracking-tighter text-sm">{role}</h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${role === 'Proprietário' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                    {role === 'Proprietário' ? 'Master (Admin)' : 'Perfil Customizável'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    {role === 'Proprietário' && (
                       <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-[10px] text-indigo-700 font-bold mb-4">
                          Permissões do Proprietário são mantidas em 100% para segurança da conta master.
                       </div>
                    )}
                    
                    {/* TELAS */}
                    <section>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Monitor className="w-3 h-3" /> Acesso às Telas
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {screens.map(s => {
                          const active = localPermissions[role]?.screens?.[s.id] !== false;
                          const isLock = role === 'Proprietário';
                          return (
                            <button
                              key={s.id}
                              disabled={isLock}
                              onClick={() => handleToggle(role, 'screens', s.id)}
                              className={`flex items-center justify-between p-2.5 rounded-lg border-2 transition-all active:scale-95 ${active ? `${s.border} ${s.bg} ${s.text}` : 'border-gray-50 bg-gray-50 text-gray-400 opacity-40'} ${isLock ? 'cursor-not-allowed opacity-100' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                {s.icon && <s.icon className={`w-3.5 h-3.5 ${active ? s.text : 'text-gray-400'}`} />}
                                <span className="text-[10px] font-bold uppercase tracking-tighter">{s.label}</span>
                              </div>
                              {active ? <Check className={`w-3.5 h-3.5 ${s.text}`} /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* AÇÕES */}
                    <section>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Ações Permitidas
                      </h4>
                      <div className="space-y-2">
                        {actions.map(a => {
                          const active = localPermissions[role]?.actions?.[a.id] !== false;
                          const isLock = role === 'Proprietário';
                          return (
                            <button
                              key={a.id}
                              disabled={isLock}
                              onClick={() => handleToggle(role, 'actions', a.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${active ? 'border-green-100 bg-green-50/30 text-green-900' : 'border-gray-50 bg-gray-50/50 text-gray-400 opacity-60'} ${isLock ? 'cursor-not-allowed opacity-100' : ''}`}
                            >
                              <span className="text-xs font-bold">{a.label}</span>
                              <div className={`w-11 h-6 rounded-full relative transition-all duration-300 shadow-inner ${active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <button 
        onClick={salvar}
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
      >
        <Save className="w-5 h-5" /> Salvar Quadro de Comando
      </button>
    </div>
  );
}
