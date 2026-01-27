import React, { useState, useMemo, Suspense } from 'react';
import { CloudRain, Search, Check, Droplets, Cloud, Loader2, Satellite } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, TableWithShowMore, SearchableSelect, Input } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// Lazy load weather component
const WeatherDashboard = React.lazy(() => import('../components/weather/WeatherDashboard'));

// ==========================================
// TELA PRINCIPAL: CHUVAS (PLUVIOMETRIA)
// ==========================================
export default function ChuvasScreen({ initialTab = 'registro' }: { initialTab?: 'registro' | 'previsao' }) {
  const { state, dados, dispatch, setTela, ativos, genericSave, fazendaSelecionada } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
  
  // Estado do Formulário
  const [form, setForm] = useState({ 
      data: U.todayIso(), 
      local: '', 
      milimetros: '' 
  });
  
  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'registro' | 'previsao'>(initialTab);

  // Get farm coordinates
  const hasCoordinates = fazendaSelecionada?.latitude && fazendaSelecionada?.longitude;

  const enviar = (e: any) => {
    e.preventDefault();
    if (!form.local || !form.milimetros) { toast.error("Preencha Local e Milímetros"); return; }
    
    // --- VERIFICAÇÃO DE DUPLICIDADE ---
    const jaExiste = (dados.chuvas || []).some((c: any) => c.data === form.data && c.local === form.local);
    if (jaExiste) {
        toast.error(`Já existe um registro para ${form.local} nesta data (${U.formatDate(form.data)}).`);
        return;
    }
    // ----------------------------------
    
    const mm = U.parseDecimal(form.milimetros);
    const novo = { ...form, milimetros: mm, id: U.id('CH-') };
    
    const descOS = `Chuva: ${form.local} (${mm}mm)`;
    genericSave('chuvas', novo, { type: ACTIONS.ADD_RECORD, modulo: 'chuvas' });

    // 2. Persistência OS
    const novaOS = {
        id: U.id('OS-CH-'),
        modulo: 'Pluviometria',
        descricao: descOS,
        detalhes: { "Local": form.local, "Volume": `${mm} mm` },
        status: 'Pendente',
        data: new Date().toISOString()
    };

    genericSave('os', novaOS, {
        type: ACTIONS.ADD_RECORD,
        modulo: 'os',
        record: novaOS
    });
    
    setForm({ data: U.todayIso(), local: '', milimetros: '' });
    toast.success('Registro de chuva salvo!');
  };

  const excluir = (id: string) => { 
    dispatch({ 
      type: ACTIONS.SET_MODAL, 
      modal: { 
        isOpen: true, 
        message: 'Excluir registro?', 
        onConfirm: () => { 
          dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'chuvas', id }); 
          dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); 
          toast.error('Registro excluído.'); 
        } 
      } 
    }); 
  };
  
  const listFilter = useMemo(() => (dados.chuvas || []).filter((i:any) => {
      const txt = filterText.toLowerCase();
      return (!filterData || i.data === filterData) && 
             (!filterText || i.local?.toLowerCase().includes(txt));
  }).reverse(), [dados.chuvas, filterData, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Pluviometria" icon={CloudRain} colorClass="bg-cyan-500" />
      
      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('registro')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2
            ${activeTab === 'registro' 
              ? 'bg-white text-cyan-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Droplets className="w-4 h-4" />
          Registros
        </button>
        <button
          onClick={() => setActiveTab('previsao')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2
            ${activeTab === 'previsao' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Cloud className="w-4 h-4" />
          Previsão
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'registro' ? (
        <>
          {rolePermissions?.actions?.chuvas_registro !== false && (
            <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
              <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-500"/> Novo Registro
              </h2>
              
              <form onSubmit={enviar} className="space-y-4">
                {/* Campo Data Manual */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Data da Coleta <span className="text-red-500">*</span></label>
                  <div className="relative">
                      <input 
                          type="date" 
                          value={form.data} 
                          onChange={(e) => setForm({ ...form, data: e.target.value })} 
                          className="w-full pl-3 pr-3 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-cyan-500 focus:outline-none"
                          required
                      />
                  </div>
                </div>
                
                <SearchableSelect 
                    label="Local (Pluviômetro)" 
                    placeholder="Onde choveu? Ex: Sede" 
                    options={ativos.locais} 
                    value={form.local} 
                    onChange={(e:any) => setForm({ ...form, local: e.target.value })} 
                    required 
                    color="cyan"
                />
                
                <div className="space-y-1">
                   <div className="relative">
                        <Input 
                           label="Volume (mm)"
                           type="text" 
                           value={form.milimetros} 
                           onChange={(e: any) => setForm({...form, milimetros: e.target.value})}
                           numeric={true}
                           placeholder="Ex: 12,5"
                           required
                        />
                        <span className="absolute right-4 top-8 text-sm font-bold text-gray-400">mm</span>
                   </div>
                </div>

  
                <button type="submit" className="w-full bg-cyan-500 text-white py-3 rounded-lg font-bold hover:bg-cyan-600 transition-colors shadow-md flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" /> Registrar Chuva
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
            <div className="p-3 border-b bg-gray-50">
                <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Chuvas</h2>
                <div className="flex gap-2">
                    <input type="date" value={filterData} onChange={e => setFilterData(e.target.value)} className="text-xs border rounded p-2" />
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                        <input type="text" placeholder="Buscar Estação..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-8 text-xs border rounded p-2" />
                    </div>
                </div>
            </div>
            <TableWithShowMore data={listFilter}>
                {(items:any[], Row:any) => (
                    <>
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th>
                                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Estação</th>
                                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Volume</th>
                                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map(item => (
                                <Row key={item.id} onDelete={() => excluir(item.id)}>
                                    <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{U.formatDate(item.data)}</td>
                                    <td className="px-3 py-2 text-gray-700 text-xs font-medium">{item.local || item.estacao}</td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="font-bold text-cyan-600 text-sm">{item.milimetros} mm</div>
                                    </td>
                                </Row>
                            ))}
                        </tbody>
                    </>
                )}
            </TableWithShowMore>
          </div>
        </>
      ) : (
        /* Weather Forecast Tab */
        <div className="space-y-4">
          {hasCoordinates ? (
            <Suspense fallback={
              <div className="bg-white rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            }>
              <WeatherDashboard 
                latitude={fazendaSelecionada.latitude}
                longitude={fazendaSelecionada.longitude}
                farmName={fazendaSelecionada.nome}
              />
            </Suspense>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center">
              <Satellite className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-700 mb-2">Localização não configurada</h3>
              <p className="text-gray-500 text-sm mb-4">
                Para ver a previsão do tempo, configure as coordenadas da fazenda nas Configurações.
              </p>
              <button
                onClick={() => setTela('config')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Ir para Configurações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}