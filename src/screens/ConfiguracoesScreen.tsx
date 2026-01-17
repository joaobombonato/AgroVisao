import React, { useState } from 'react';
import { Settings, ListPlus, Save, Lock, Sliders, ArrowRight } from 'lucide-react'; 
import { PageHeader } from '../components/ui/Shared';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import { ASSET_DEFINITIONS } from '../data/assets';
import { dbService } from '../services'; // Import direto
import AssetListEditor from '../features/settings/components/AssetListEditor';
import ParametrosEditor from '../features/settings/components/ParametrosEditor';

// ===========================================
// 3. Componente Principal de Configurações
// ===========================================
// Em ConfiguracoesScreen()
export default function ConfiguracoesScreen() {
    const { setTela, ativos, dispatch, fazendaNome, fazendaId, fazendasDisponiveis } = useAppContext();
    const [view, setView] = useState('principal'); // principal, listas, parametros, editors para update
    
// ...

    if (view === 'parametros') {
        const params = ativos.parametros || {};
        const currentFazendaNome = fazendaNome || '';

        const handleSaveParams = async (novaConfig: any) => {
             // 1. Atualizar Parâmetros (Local/JSON no futuro)
             dispatch({ 
                 type: ACTIONS.UPDATE_ATIVOS, 
                 chave: 'parametros', 
                 novaLista: novaConfig 
             });

             // 2. Atualizar Nome da Fazenda (Se mudou)
             if (novaConfig.fazendaNome && novaConfig.fazendaNome !== currentFazendaNome) {
                 if (fazendaId) {
                     try {
                         await dbService.update('fazendas', fazendaId, { nome: novaConfig.fazendaNome }, fazendaId);
                         
                         // Atualiza estado global corretamente mantendo a lista
                         dispatch({ 
                             type: ACTIONS.SET_FAZENDA, 
                             fazendaId, 
                             fazendaNome: novaConfig.fazendaNome,
                             fazendas: fazendasDisponiveis.map((f:any) => f.id === fazendaId ? { ...f, nome: novaConfig.fazendaNome } : f)
                         });
                    
                     } catch (e: any) {
                         console.error(e);
                         // Se falhar o nome, avisa mas não bloqueia o resto
                         const isPermission = e.message?.includes('permissão') || e.message?.includes('row-level security');
                         toast.error(isPermission 
                            ? 'Nome bloqueado pelo Admin (RLS), mas parâmetros foram salvos!' 
                            : `Erro no nome: ${e.message}`, 
                            { duration: 5000 }
                         );
                         setView('principal'); // Sai mesmo com erro no nome, pois params foram salvos
                         return;
                     }
                 }
             }

             toast.success('Configurações salvas com sucesso!');
             setView('principal');
        };

        // Passamos 'fazendaNome' dentro do objeto de parâmetros para o editor tratar unificado
        const paramsWithFazenda = { ...params, fazendaNome: currentFazendaNome };

        return <ParametrosEditor currentParams={paramsWithFazenda} onSave={handleSaveParams} onBack={() => setView('principal')} />;
    }
    
    if (view === 'listas') {
        return (
            <div className="space-y-6 p-4 pb-24 max-w-md mx-auto">
                <PageHeader setTela={setView} title="Cadastros & Listas" icon={ListPlus} colorClass="bg-indigo-600" backTarget={'principal'} />
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Ativos Operacionais (Banco)</h2>
                    {Object.entries(ASSET_DEFINITIONS).filter(([key, def]: any) => def.table).map(([key, def]: any) => (
                        <MenuButton 
                            key={key}
                            icon={def.icon} 
                            title={def.title} 
                            desc={`Gerenciar cadastros de ${def.title.toLowerCase()}`} 
                            onClick={() => handleOpenEditor(key)} 
                            color={`bg-${def.color}-50`} 
                        />
                    ))}
                </div>

                <div className="space-y-3 pt-4">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Listas Fixas (Local)</h2>
                    {Object.entries(ASSET_DEFINITIONS).filter(([key, def]: any) => !def.table).map(([key, def]: any) => (
                        <MenuButton 
                            key={key}
                            icon={def.icon} 
                            title={def.title} 
                            desc={`Gerenciar cadastros de ${def.title.toLowerCase()}`} 
                            onClick={() => handleOpenEditor(key)} 
                            color={`bg-${def.color}-50`} 
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 pb-24 max-w-md mx-auto">
            <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-600" />
            
            <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Sistema</h2>
                <MenuButton icon={Sliders} title="Parâmetros Operacionais" desc="Estoque, Preços, Alertas e Metas" onClick={() => setView('parametros')} color="bg-blue-50" />
                <MenuButton icon={ListPlus} title="Cadastros & Listas" desc="Máquinas, Produtos, Talhões..." onClick={() => setView('listas')} color="bg-indigo-50" />
            </div>

            <div className="space-y-3 pt-2">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Dados & Segurança</h2>
                <MenuButton icon={Save} title="Backup de Dados" desc="Exportar ou Importar JSON" onClick={() => toast("Em breve: Exportação JSON")} />
                <MenuButton icon={Lock} title="Permissões" desc="Controle de Usuários" onClick={() => toast("Em breve: Módulo Usuários")} />
            </div>
            
            <div className="text-center pt-8 opacity-50 text-xs text-gray-400">
                AgroDev v3.4 | Arquiteto: JF Aplicativos
            </div>
        </div>
    );
}

// Componente auxiliar de menu
const MenuButton = ({ icon: Icon, title, desc, onClick, color = 'bg-gray-50' }: any) => (
    <button onClick={onClick} className={`w-full flex items-center p-3 rounded-xl shadow-sm ${color} transition-shadow hover:shadow-md border-l-4 border-green-500 hover:border-green-600`}>
        <div className="mr-3 p-2 bg-white rounded-lg shadow-sm">
             <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="text-left">
            <p className="font-bold text-sm text-gray-800">{title}</p>
            <p className="text-xs text-gray-600">{desc}</p>
        </div>
        <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
    </button>
);