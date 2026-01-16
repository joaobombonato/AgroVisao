import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Droplets, Fuel, Wrench, Package, Users, MapPin, Sprout, TrendingUp, Plus, Edit2, Trash2, Save, X, Menu, Home, Settings, FileText, Tractor } from 'lucide-react';

const App = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Estados para dados
  const [talhoes, setTalhoes] = useState([
    { id: 1, nome: 'Talhão 01', area: 50.5, cultura: 'Soja', safra: '2024/25' },
    { id: 2, nome: 'Talhão 02', area: 45.2, cultura: 'Milho', safra: '2024/25' },
    { id: 3, nome: 'Talhão 03', area: 38.7, cultura: 'Soja', safra: '2024/25' }
  ]);
  
  const [maquinas, setMaquinas] = useState([
    { id: 1, nome: 'Trator John Deere 6175R', tipo: 'Trator', horasTotal: 3450, ultimaManutencao: '2024-11-15' },
    { id: 2, nome: 'Pulverizador Jacto', tipo: 'Pulverizador', horasTotal: 1820, ultimaManutencao: '2024-11-20' },
    { id: 3, nome: 'Colheitadeira Case 2388', tipo: 'Colheitadeira', horasTotal: 2100, ultimaManutencao: '2024-10-30' }
  ]);
  
  const [abastecimentos, setAbastecimentos] = useState([
    { id: 1, data: '2024-12-01', maquinaId: 1, litros: 180, hodometro: 3450, tipo: 'Diesel S10' },
    { id: 2, data: '2024-12-02', maquinaId: 2, litros: 120, hodometro: 1820, tipo: 'Diesel S10' },
    { id: 3, data: '2024-12-03', maquinaId: 1, litros: 200, hodometro: 3465, tipo: 'Diesel S10' }
  ]);
  
  const [manutencoes, setManutencoes] = useState([
    { id: 1, data: '2024-11-15', maquinaId: 1, tipo: 'Preventiva', descricao: 'Troca de óleo e filtros', custo: 850 },
    { id: 2, data: '2024-11-20', maquinaId: 2, tipo: 'Corretiva', descricao: 'Reparo bomba', custo: 1200 }
  ]);
  
  const [prescricoes, setPrescricoes] = useState([
    { id: 1, data: '2024-11-25', talhaoId: 1, tipo: 'Herbicida', produto: 'Glifosato', dose: 3.5, unidade: 'L/ha' },
    { id: 2, data: '2024-11-28', talhaoId: 2, tipo: 'Fertilizante', produto: 'Ureia', dose: 150, unidade: 'kg/ha' }
  ]);
  
  const [estoque, setEstoque] = useState([
    { id: 1, categoria: 'Combustível', item: 'Diesel S10', quantidade: 5000, unidade: 'L', minimo: 2000 },
    { id: 2, categoria: 'Defensivo', item: 'Glifosato', quantidade: 200, unidade: 'L', minimo: 100 },
    { id: 3, categoria: 'Fertilizante', item: 'Ureia', quantidade: 5000, unidade: 'kg', minimo: 3000 },
    { id: 4, categoria: 'Peça', item: 'Filtro de Óleo', quantidade: 15, unidade: 'un', minimo: 10 }
  ]);
  
  const [refeicoes, setRefeicoes] = useState([
    { id: 1, data: '2024-12-01', centroCusto: 'Operacional', tipo: 'Almoço', quantidade: 25, valorUnitario: 12 },
    { id: 2, data: '2024-12-01', centroCusto: 'Administrativo', tipo: 'Almoço', quantidade: 5, valorUnitario: 12 }
  ]);
  
  const [leituras, setLeituras] = useState([
    { id: 1, mes: '2024-10', local: 'Sede', leitura: 12450, consumo: 850 },
    { id: 2, mes: '2024-11', local: 'Sede', leitura: 13320, consumo: 870 },
    { id: 3, mes: '2024-10', local: 'Armazém', leitura: 5230, consumo: 420 }
  ]);
  
  const [pluviometria, setPluviometria] = useState([
    { id: 1, data: '2024-11-28', local: 'Estação Central', precipitacao: 15.5 },
    { id: 2, data: '2024-11-29', local: 'Estação Central', precipitacao: 8.2 },
    { id: 3, data: '2024-11-30', local: 'Estação Central', precipitacao: 22.8 },
    { id: 4, data: '2024-12-01', local: 'Estação Central', precipitacao: 0 },
    { id: 5, data: '2024-12-02', local: 'Estação Central', precipitacao: 45.3 }
  ]);

  // Formulários
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Dados para gráficos do dashboard
  const areasPorCultura = useMemo(() => {
    const culturas = {};
    talhoes.forEach(t => {
      culturas[t.cultura] = (culturas[t.cultura] || 0) + t.area;
    });
    return Object.entries(culturas).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [talhoes]);

  const consumoCombustivel = useMemo(() => {
    const ultimos7 = abastecimentos.slice(-7).reverse();
    return ultimos7.map(a => ({
      data: a.data.split('-')[2] + '/' + a.data.split('-')[1],
      litros: a.litros
    }));
  }, [abastecimentos]);

  const estoquesBaixos = useMemo(() => {
    return estoque.filter(e => e.quantidade <= e.minimo);
  }, [estoque]);

  const precipitacaoMensal = useMemo(() => {
    return pluviometria.slice(-10).map(p => ({
      data: p.data.split('-')[2] + '/' + p.data.split('-')[1],
      mm: p.precipitacao
    }));
  }, [pluviometria]);

  // Funções auxiliares
  const openForm = (type, item = null) => {
    setEditingItem(item);
    setFormData(item || {});
    setShowForm(type);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSave = (type) => {
    const setters = {
      'talhao': setTalhoes,
      'maquina': setMaquinas,
      'abastecimento': setAbastecimentos,
      'manutencao': setManutencoes,
      'prescricao': setPrescricoes,
      'estoque': setEstoque,
      'refeicao': setRefeicoes,
      'leitura': setLeituras,
      'pluviometria': setPluviometria
    };

    const setter = setters[type];
    if (editingItem) {
      setter(prev => prev.map(item => item.id === editingItem.id ? { ...formData, id: item.id } : item));
    } else {
      setter(prev => [...prev, { ...formData, id: Date.now() }]);
    }
    closeForm();
  };

  const handleDelete = (type, id) => {
    const setters = {
      'talhao': setTalhoes,
      'maquina': setMaquinas,
      'abastecimento': setAbastecimentos,
      'manutencao': setManutencoes,
      'prescricao': setPrescricoes,
      'estoque': setEstoque,
      'refeicao': setRefeicoes,
      'leitura': setLeituras,
      'pluviometria': setPluviometria
    };
    
    if (confirm('Deseja realmente excluir este item?')) {
      setters[type](prev => prev.filter(item => item.id !== id));
    }
  };

  // Componente de Menu Lateral
  const Sidebar = () => (
    <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-green-800 to-green-900 text-white transition-all duration-300 flex flex-col`}>
      <div className="p-4 flex items-center justify-between border-b border-green-700">
        {sidebarOpen && <h1 className="text-xl font-bold">AgroGestão</h1>}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-green-700 rounded">
          <Menu size={20} />
        </button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {[
          { id: 'dashboard', icon: Home, label: 'Dashboard' },
          { id: 'talhoes', icon: MapPin, label: 'Talhões' },
          { id: 'prescricoes', icon: Sprout, label: 'Prescrições' },
          { id: 'maquinas', icon: Tractor, label: 'Máquinas' },
          { id: 'abastecimento', icon: Fuel, label: 'Abastecimento' },
          { id: 'manutencao', icon: Wrench, label: 'Manutenção' },
          { id: 'estoque', icon: Package, label: 'Estoque' },
          { id: 'refeicoes', icon: Users, label: 'Refeições' },
          { id: 'leituras', icon: TrendingUp, label: 'Leituras Energia' },
          { id: 'pluviometria', icon: Droplets, label: 'Pluviometria' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${
              activeModule === item.id ? 'bg-green-600' : 'hover:bg-green-700'
            }`}
          >
            <item.icon size={20} />
            {sidebarOpen && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );

  // Componente de Dashboard
  const Dashboard = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Dashboard Geral</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Área Total</p>
              <p className="text-3xl font-bold">{talhoes.reduce((sum, t) => sum + t.area, 0).toFixed(1)} ha</p>
            </div>
            <MapPin size={40} className="opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Máquinas Ativas</p>
              <p className="text-3xl font-bold">{maquinas.length}</p>
            </div>
            <Tractor size={40} className="opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Estoques Baixos</p>
              <p className="text-3xl font-bold">{estoquesBaixos.length}</p>
            </div>
            <Package size={40} className="opacity-80" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Chuva (últimos 7d)</p>
              <p className="text-3xl font-bold">
                {pluviometria.slice(-7).reduce((sum, p) => sum + p.precipitacao, 0).toFixed(1)} mm
              </p>
            </div>
            <Droplets size={40} className="opacity-80" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Área por Cultura</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={areasPorCultura} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {areasPorCultura.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Consumo de Combustível (últimos 7 dias)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={consumoCombustivel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="litros" fill="#3b82f6" name="Litros" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Pluviometria (últimos 10 dias)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={precipitacaoMensal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="mm" stroke="#10b981" strokeWidth={2} name="Precipitação (mm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Alertas de Estoque</h3>
          {estoquesBaixos.length > 0 ? (
            <div className="space-y-3">
              {estoquesBaixos.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div>
                    <p className="font-semibold text-gray-800">{item.item}</p>
                    <p className="text-sm text-gray-600">{item.categoria}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{item.quantidade} {item.unidade}</p>
                    <p className="text-xs text-gray-500">Mín: {item.minimo}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Nenhum alerta de estoque</p>
          )}
        </div>
      </div>
    </div>
  );

  // Componente de Tabela Genérica
  const DataTable = ({ title, data, columns, onAdd, onEdit, onDelete, addLabel = 'Adicionar' }) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          {addLabel}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length > 0 ? data.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-gray-500">
                    Nenhum registro encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Formulário Modal
  const FormModal = ({ title, fields, onSave, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save size={18} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar módulo ativo
  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
        
      case 'talhoes':
        return (
          <>
            <DataTable
              title="Gestão de Talhões"
              data={talhoes}
              columns={[
                { key: 'nome', label: 'Nome' },
                { key: 'area', label: 'Área (ha)', render: (item) => item.area.toFixed(2) },
                { key: 'cultura', label: 'Cultura' },
                { key: 'safra', label: 'Safra' }
              ]}
              onAdd={() => openForm('talhao')}
              onEdit={(item) => openForm('talhao', item)}
              onDelete={(id) => handleDelete('talhao', id)}
            />
            {showForm === 'talhao' && (
              <FormModal
                title={editingItem ? 'Editar Talhão' : 'Novo Talhão'}
                fields={[
                  { key: 'nome', label: 'Nome do Talhão' },
                  { key: 'area', label: 'Área (hectares)', type: 'number' },
                  { key: 'cultura', label: 'Cultura', type: 'select', options: ['Soja', 'Milho', 'Trigo', 'Algodão', 'Café', 'Feijão'] },
                  { key: 'safra', label: 'Safra' }
                ]}
                onSave={() => handleSave('talhao')}
                onClose={closeForm}
              />
            )}
          </>
        );

      case 'prescricoes':
        return (
          <>
            <DataTable
              title="Prescrições Agronômicas"
              data={prescricoes}
              columns={[
                { key: 'data', label: 'Data' },
                { key: 'talhaoId', label: 'Talhão', render: (item) => talhoes.find(t => t.id === item.talhaoId)?.nome },
                { key: 'tipo', label: 'Tipo' },
                { key: 'produto', label: 'Produto' },
                { key: 'dose', label: 'Dose', render: (item) => `${item.dose} ${item.unidade}` }
              ]}
              onAdd={() => openForm('prescricao')}
              onEdit={(item) => openForm('prescricao', item)}
              onDelete={(id) => handleDelete('prescricao', id)}
              addLabel="Nova Prescrição"
            />
            {showForm === 'prescricao' && (
              <FormModal
                title={editingItem ? 'Editar Prescrição' : 'Nova Prescrição'}
                fields={[
                  { key: 'data', label: 'Data', type: 'date' },
                  { key: 'talhaoId', label: 'Talhão', type: 'select', options: talhoes.map(t => t.id) },
                  { key: 'tipo', label: 'Tipo', type: 'select', options: ['Herbicida', 'Inseticida', 'Fungicida', 'Fertilizante', 'Adjuvante'] },
                  { key: 'produto', label: 'Produto' },
                  { key: 'dose', label: 'Dose', type: 'number' },
                  { key: 'unidade', label: 'Unidade', type: 'select', options: ['L/ha', 'kg/ha', 'ml/ha', 'g/ha'] }
                ]}
                onSave={() => handleSave('prescricao')}
                onClose={closeForm}
              />
            )}
          </>
        );

      case 'maquinas':
        return (
          <>
            <DataTable
              title="Gestão de Máquinas"
              data={maquinas}
              columns={[
                { key: 'nome', label: 'Nome' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'horasTotal', label: 'Horas Totais' },
                { key: 'ultimaManutencao', label: 'Última Manutenção' }
              ]}
              onAdd={() => openForm('maquina')}
              onEdit={(item) => openForm('maquina', item)}
              onDelete={(id) => handleDelete('maquina', id)}
              addLabel="Nova Máquina"
            />
            {showForm === 'maquina' && (
              <FormModal
                title={editingItem ? 'Editar Máquina' : 'Nova Máquina'}
                fields={[
                  { key: 'nome', label: 'Nome/Modelo' },
                  { key: 'tipo', label: 'Tipo', type: 'select', options: ['Trator', 'Colheitadeira', 'Pulverizador', 'Plantadeira', 'Caminhão', 'Implemento'] },
                  { key: 'horasTotal', label: 'Horas Totais', type: 'number' },
                  { key: 'ultimaManutencao', label: 'Última Manutenção', type: 'date' }
                ]}
                onSave={() => handleSave('maquina')}
                onClose={closeForm}
              />
            )}
          </>
        );

      case 'abastecimento':
        return (
          <>
            <DataTable
              title="Controle de Abastecimento"
              data={abastecimentos}
              columns={[
                { key: 'data', label: 'Data' },
                { key: 'maquinaId', label: 'Máquina', render: (item) => maquinas.find(m => m.id === item.maquinaId)?.nome },
                { key: 'litros', label: 'Litros' },
                { key: 'hodometro', label: 'Hodômetro/Horímetro' },
                { key: 'tipo', label: 'Tipo Combustível' }
              ]}
              onAdd={() => openForm('abastecimento')}
              onEdit={(item) => openForm('abastecimento', item)}
              onDelete={(id) => handleDelete('abastecimento', id)}
              addLabel="Novo Abastecimento"
            />
            {showForm === 'abastecimento' && (
              <FormModal
                title={editingItem ? 'Editar Abastecimento' : 'Novo Abastecimento'}
                fields={[
                  { key: 'data', label: 'Data', type: 'date' },
                  { key: 'maquinaId', label: 'Máquina', type: 'select', options: maquinas.map(m => m.id) },
                  { key: 'litros', label: 'Litros', type: 'number' },
                  { key: 'hodometro', label: 'Hodômetro/Horímetro', type: 'number' },
                  { key: 'tipo', label: 'Tipo de Combustível', type: 'select', options: ['Diesel S10', 'Diesel S500', 'Gasolina', 'Etanol', 'Arla 32'] }
                ]}
                onSave={() => handleSave('abastecimento')}
                onClose={closeForm}
              />
            )}
          </>
        );

      case 'manutencao':
        return (
          <>
            <DataTable
              title="Controle de Manutenção"
              data={manutencoes}
              columns={[
                { key: 'data', label: 'Data' },
                { key: 'maquinaId', label: 'Máquina', render: (item) => maquinas.find(m => m.id === item.maquinaId)?.nome },
                { key: 'tipo', label: 'Tipo' },
                { key: 'descricao', label: 'Descrição' },
                { key: 'custo', label: 'Custo (R$)', render: (item) => `R$ ${item.custo.toFixed(2)}` }
              ]}
              onAdd={() => openForm('manutencao')}
              onEdit={(item) => openForm('manutencao', item)}
              onDelete={(id) => handleDelete('manutencao', id)}
              addLabel="Nova Manutenção"
            />
            {showForm === 'manutencao' && (
              <FormModal
                title={editingItem ? 'Editar Manutenção' : 'Nova Manutenção'}
                fields={[
                  { key: 'data', label: 'Data', type: 'date' },
                  { key: 'maquinaId', label: 'Máquina', type: 'select', options: maquinas.map(m => m.id) },
                  { key: 'tipo', label: 'Tipo', type: 'select', options: ['Preventiva', 'Corretiva', 'Preditiva'] },
                  { key: 'descricao', label: 'Descrição', type: 'textarea' },
                  { key: 'custo', label: 'Custo (R$)', type: 'number' }
                ]}
                onSave={() => handleSave('manutencao')}
                onClose={closeForm}
              />
            )}
          </>
        );

      case 'estoque':
        return (
          <>
            <DataTable
              title="Controle de Estoque"
              data={estoque}
              columns={[
                { key: 'categoria', label: 'Categoria' },
                { key: 'item', label: 'Item' },
                { key: 'quantidade', label: 'Quantidade' },
                { key: 'unidade', label: 'Unidade' },
                { key: 'minimo', label: 'Estoque Mínimo' },
                { key: 'status', label: 'Status', render: (item) => (
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    item.quantidade <= item.minimo ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {item.quantidade <= item.minimo ? 'Crítico' : 'Normal'}
                  </span>
                )}
              ]}
              onAdd={() => openForm('estoque')}
              onEdit={(item) => openForm('estoque', item)}
              onDelete={(id) => handleDelete('estoque', id)}
              addLabel="Novo Item"
            />
            {showForm === 'estoque' && (
              <FormModal
                title={editingItem ? 'Editar Item' : 'Novo Item'}
                fields={[
                  { key: 'categoria', label: 'Categoria', type: 'select', options: ['Combustível', 'Defensivo', 'Fertilizante', 'Peça', 'Semente', 'Outros'] },
                  { key: 'item', label: 'Nome do Item' },
                  { key: 'quantidade', label: 'Quantidade', type: 'number' },
                  { key: 'unidade', label: 'Unidade', type: 'select', options: ['L', 'kg', 'un', 'sc', 't', 'm³'] },
                  { key: 'minimo', label: 'Estoque Mínimo', type: 'number' }
                ]}
                onSave={() => handleSave('estoque')}
                onClose={closeForm}
              />
            )}
          </>
        );

      case 'refeicoes':
        return (
          <>
            <DataTable
              title="Controle de Refeições"
              data={refeicoes}
              columns={[
                { key: 'data', label: 'Data' },
                { key: 'centroCusto', label: 'Centro de Custo' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'quantidade', label: 'Quantidade' },
                { key: 'valorUnitario', label: 'Valor Unit. (R$)', render: (item) => `R$ ${item.valorUnitario.toFixed(2)}` },
                { key: 'total', label: 'Total (R$)', render: (item) => `R$ ${(item.quantidade * item.valorUnitario).toFixed(2)}` }
              ]}
              onAdd={() => openForm('refeicao')}
              onEdit={(item) => openForm('refeicao', item)}
              onDelete={(id) => handleDelete('refeicao', id)}
              addLabel="Novo Registro"
            />
            {showForm === 'refeicao' && (
              <FormModal
                title={editingItem ? 'Editar Refeição' : 'Novo Registro'}
                fields={[
                  { key: 'data', label: 'Data', type: 'date' },
                  { key: 'centroCusto', label: 'Centro de Custo', type: 'select', options: ['Operacional', 'Administrativo', 'Colheita', 'Plantio', 'Manutenção'] },
                  { key: 'tipo', label: 'Tipo', type: 'select', options: ['Café da Manhã', 'Almoço', 'Lanche', 'Jantar'] },
                  { key: 'quantidade', label: 'Quantidade de Pessoas', type: 'number' },
                  { key: 'valorUnitario', label: 'Valor Unitário (R$)', type: 'number' }
                ]}
                onSave={() => handleSave('refeicao')}
                onClose={closeForm}
              />
            )}
          </>
        );

      case 'leituras':
        return (
          <>
            <DataTable
              title="Leituras de Energia Elétrica"
              data={leituras}
              columns={[
                { key: 'mes', label: 'Mês/Ano' },
                { key: 'local', label: 'Local' },
                { key: 'leitura', label: 'Leitura (kWh)' },
                { key: 'consumo', label: 'Consumo (kWh)' }
              ]}
              onAdd={() => openForm('leitura')}
              onEdit={(item) => openForm('leitura', item)}
              onDelete={(id) => handleDelete('leitura', id)}
              addLabel="Nova Leitura"
            />
            {showForm === 'leitura' && (
              <FormModal
                title={editingItem ? 'Editar Leitura' : 'Nova Leitura'}
                fields={[
                  { key: 'mes', label: 'Mês/Ano', type: 'month' },
                  { key: 'local', label: 'Local', type: 'select', options: ['Sede', 'Armazém', 'Galpão', 'Irrigação', 'Secador'] },
                  { key: 'leitura', label: 'Leitura (kWh)', type: 'number' },
                  { key: 'consumo', label: 'Consumo (kWh)', type: 'number' }
                ]}
                onSave={() => handleSave('leitura')}
                onClose={closeForm}
              />
            )}
          </>
        );

      case 'pluviometria':
        return (
          <>
            <DataTable
              title="Monitoramento Pluviométrico"
              data={pluviometria}
              columns={[
                { key: 'data', label: 'Data' },
                { key: 'local', label: 'Estação' },
                { key: 'precipitacao', label: 'Precipitação (mm)', render: (item) => `${item.precipitacao.toFixed(1)} mm` }
              ]}
              onAdd={() => openForm('pluviometria')}
              onEdit={(item) => openForm('pluviometria', item)}
              onDelete={(id) => handleDelete('pluviometria', id)}
              addLabel="Novo Registro"
            />
            {showForm === 'pluviometria' && (
              <FormModal
                title={editingItem ? 'Editar Registro' : 'Novo Registro'}
                fields={[
                  { key: 'data', label: 'Data', type: 'date' },
                  { key: 'local', label: 'Estação/Local' },
                  { key: 'precipitacao', label: 'Precipitação (mm)', type: 'number' }
                ]}
                onSave={() => handleSave('pluviometria')}
                onClose={closeForm}
              />
            )}
          </>
        );

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {renderModule()}
      </main>
    </div>
  );
};

export default App;