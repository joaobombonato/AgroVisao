import React, { useState } from 'react';
import { Fuel, ChevronDown, Check, Gauge, Truck, ChevronUp, Factory, Plus, Wrench, AlertCircle } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { PageHeader, Input, SearchableSelect } from '../../../components/ui/Shared';
import { U, getOperationalDateLimits } from '../../../utils';
import { toast } from 'react-hot-toast';
import { 
  CompraCombustivelForm, 
  EstoquePainel, 
  AbastecimentoHistorico,
  AjusteEstoqueModal
} from '../components';
import { useAbastecimentoForm } from '../hooks/useAbastecimentoForm';

// ==========================================
// TELA PRINCIPAL: ABASTECIMENTO
// ==========================================
export default function AbastecimentoScreen() {
  const { state, setTela, ativos } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
  
  const [showCompraForm, setShowCompraForm] = useState(false);

  // Hook centralizado para toda lógica do formulário
  const {
    form,
    setForm,
    showObs,
    setShowObs,
    handleMaquinaChange,
    litrosCalculados,
    mediaConsumo,
    custoEstimado,
    precoInfo,
    enviar,
    getUnidadeMedida
  } = useAbastecimentoForm();

  const [showAjusteForm, setShowAjusteForm] = useState(false);
  const { genericSave } = useAppContext();

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Abastecimento" icon={Fuel} colorClass="bg-red-500" />
      
      {/* PAINEL DE ESTOQUE (COMPONENTE) */}
      <EstoquePainel />

      {showCompraForm && <CompraCombustivelForm onClose={() => setShowCompraForm(false)} />}

      {/* ÁREA DE CONTROLE DE ESTOQUE */}
      {rolePermissions?.actions?.abastecimento_compra !== false && (
        <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
          <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 text-center uppercase text-sm flex items-center justify-center gap-2">
            <Factory className="w-5 h-5 text-gray-600" /> Controle de Estoque
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button 
                onClick={() => setShowCompraForm(true)} 
                className="bg-green-600 text-white py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 active:scale-95 flex items-center justify-center gap-2 text-xs"
            >
                <Plus className="w-4 h-4" /> Comprar Diesel
            </button>
            <button 
                onClick={() => setShowAjusteForm(true)} 
                className="bg-amber-500 text-white py-2 rounded-lg font-bold shadow-sm hover:bg-amber-600 active:scale-95 flex items-center justify-center gap-2 text-xs"
            >
                <Wrench className="w-4 h-4" /> Ajustar Estoque
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE AJUSTE DE ESTOQUE */}
      {showAjusteForm && (
          <AjusteEstoqueModal onClose={() => setShowAjusteForm(false)} />
      )}

      {/* FORMULÁRIO DE REGISTRO DE CONSUMO */}
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
          <Truck className="w-5 h-5 text-red-500"/> Registro de Consumo
        </h2>
        
        <form onSubmit={enviar} className="space-y-4">
          
          <Input 
            label="Data do Consumo" 
            type="date" 
            value={form.data} 
            onChange={(e: any) => setForm({ ...form, data: e.target.value })} 
            required 
            max={getOperationalDateLimits().max}
            min={getOperationalDateLimits().min}
          />

          <SearchableSelect 
            label="Máquina / Veículo" 
            placeholder="Buscar o Maquinas... Ex: Trator" 
            options={(ativos?.maquinas || []).map((m: any) => ({
              ...m,
              label: `${m.codigo || m.id || ''} - ${m.tipo || ''} ${m.marca || ''} ${m.modelo || ''} - ${m.potencia || ''} ${m.unidade_potencia || ''}`.replace(/\s+/g, ' ').trim() || m.nome // Fallback para nome se falhar
            }))}
            value={form.maquina} 
            onChange={handleMaquinaChange} 
            required
            color="red"
          />

          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
            <input 
              type="checkbox" 
              id="tanqueCheio"
              checked={form.tanqueCheio}
              onChange={(e) => setForm({...form, tanqueCheio: e.target.checked})}
              className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300"
            />
            <label htmlFor="tanqueCheio" className="text-xs font-bold text-red-800 cursor-pointer">
              Tanque foi COMPLETADO? (Para cálculo exato de média)
            </label>
          </div>

          {/* OBSERVAÇÃO OPCIONAL */}
          <div>
            <button type="button" onClick={() => setShowObs(!showObs)} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 mb-1">
              {showObs ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
              {showObs ? 'Ocultar Observação' : 'Adicionar Observação (Opcional)'}
            </button>
            {showObs && (
              <div className="animate-in slide-in-from-top-1">
                <textarea 
                  value={form.obs} 
                  onChange={(e) => setForm({...form, obs: e.target.value})} 
                  placeholder="Detalhes adicionais..." 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:outline-none h-16 resize-none"
                />
              </div>
            )}
          </div>

          {/* LEITURAS BOMBA/HORÍMETRO */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b pb-1 mb-1 text-center">Leitura da Bomba</div>
            
            {/* BOMBA INICIAL (AUTO) */}
            <div className="space-y-1">
              <div className="flex justify-center items-center gap-1">
                <label className="block text-xs font-bold text-gray-500 text-center">Inicial</label>
                <span className="text-[10px] text-red-600 bg-red-100 px-1 rounded">Auto</span>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-2 relative">
                <div className="absolute left-2 top-2 w-4 h-4 text-red-400" />
                <input 
                  type="text" 
                  value={U.formatValue(form.bombaInicial)} 
                  readOnly
                  className="w-full bg-transparent font-bold text-red-800 outline-none text-center" 
                  placeholder="-" 
                />
              </div>
            </div>
            
            {/* BOMBA FINAL */}
            <div className="space-y-1">
              <Input 
                label="Final" 
                mask="decimal"
                placeholder="Ex: 12.550,5"
                value={form.bombaFinal} 
                onChange={(e: any) => setForm({...form, bombaFinal: e.target.value})}
                required
              />
            </div>

            <div className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b pb-1 mb-1 mt-2 text-center">Leitura {getUnidadeMedida() === 'Km' ? 'Hodômetro' : 'Horímetro'}</div>

            {/* HORÍMETRO ANTERIOR (AUTO) */}
            <div className="space-y-1">
              <div className="flex justify-center items-center gap-1">
                <label className="block text-xs font-bold text-gray-500 text-center">Anterior</label>
                <span className="text-[10px] text-red-600 bg-red-100 px-1 rounded">Auto</span>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-2 relative">
                <Gauge className="absolute left-2 top-2 w-4 h-4 text-red-400" />
                <input 
                  type="text" 
                  value={form.horimetroAnterior} 
                  readOnly 
                  className="w-full pl-6 bg-transparent font-bold text-red-800 outline-none text-center" 
                  placeholder="-" 
                />
              </div>
            </div>

            {/* HORÍMETRO ATUAL */}
            <div className="space-y-1">
              <Input 
                label="Atual" 
                mask="decimal"
                placeholder="Ex: 501,5"
                value={form.horimetroAtual} 
                onChange={(e: any) => setForm({...form, horimetroAtual: e.target.value})}
                required 
              />
            </div>
          </div>

          {/* RESUMO CALCULADO */}
          <div className="flex justify-between items-center bg-gray-800 text-white p-4 rounded-xl shadow-lg">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Litros</p>
              <p className="text-xl font-bold text-red-400">{litrosCalculados} <span className="text-xs text-gray-500">L</span></p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Média Consumo</p>
              <p className="text-xl font-bold">{mediaConsumo} <span className="text-xs text-gray-500">{getUnidadeMedida() === 'Km' ? 'Km/L' : 'L/h'}</span></p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Custo Estimado</p>
              <p className="text-xl font-bold text-green-400">R$ {U.formatValue(custoEstimado)}</p>
              <p className="text-[9px] text-gray-500">Base: R$ {U.formatValue(precoInfo?.val)} ({precoInfo?.source})</p>
            </div>
          </div>

          <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-2">
            <Check className="w-5 h-5"/> Confirmar Abastecimento
          </button>
        </form>
      </div>

      {/* HISTÓRICO (COMPONENTE) */}
      <AbastecimentoHistorico />
    </div>
  );
}
