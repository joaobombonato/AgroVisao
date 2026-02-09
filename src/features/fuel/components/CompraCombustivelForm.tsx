/**
 * CompraCombustivelForm - Modal para registro de compras de diesel
 * 
 * Extraído de AbastecimentoScreen para melhor organização
 */
import React, { useState, useEffect } from 'react';
import { Fuel, X, Plus, Minus, Check } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { Input } from '../../../components/ui/Shared';
import { U, getOperationalDateLimits } from '../../../utils';
import { toast } from 'react-hot-toast';

interface CompraCombustivelFormProps {
  onClose: () => void;
}

export function CompraCombustivelForm({ onClose }: CompraCombustivelFormProps) {
  const { dados, dispatch } = useAppContext();
  const [form, setForm] = useState({ 
    data: U.todayIso(), 
    notaFiscal: '', 
    litros: '', 
    valorUnitario: '', 
    nfFrete: '',
    valorFrete: '',
    valorTotal: '' 
  });
  
  const [showFrete, setShowFrete] = useState(false);

  // Cálculo automático do Total (Combustível + Frete)
  useEffect(() => {
    const l = U.parseDecimal(form.litros);
    const v = U.parseDecimal(form.valorUnitario);
    const frete = showFrete ? U.parseDecimal(form.valorFrete) : 0;
    
    if (l > 0 && v > 0) {
      setForm(prev => ({ ...prev, valorTotal: ((l * v) + frete).toFixed(2) }));
    }
  }, [form.litros, form.valorUnitario, form.valorFrete, showFrete]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.litros || !form.valorUnitario || !form.notaFiscal) {
      toast.error("Preencha Nota Fiscal, Litros e Valor");
      return;
    }
    const novo = { ...form, id: U.id('CP-') };
    
    const descFrete = showFrete ? ` + Frete R$${form.valorFrete}` : '';
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'compras', record: novo, osDescricao: `Compra Diesel: ${form.litros}L (NF: ${form.notaFiscal})${descFrete}` });
    
    toast.success('Entrada de estoque registrada!');
    onClose();
  };

  const ultimasCompras = (dados?.compras || []).slice(-5).reverse();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4 bg-green-50 rounded-t-xl">
          <h2 className="text-lg font-bold flex items-center gap-2 text-green-800"><Fuel className="w-5 h-5" /> Nova Compra de Diesel</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-green-200 text-green-800"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={enviar} className="p-4 space-y-3">
          <Input 
            label="Data da Compra" 
            type="date" 
            value={form.data} 
            onChange={(e: any) => setForm({ ...form, data: e.target.value })} 
            required 
            max={getOperationalDateLimits().max}
            min={getOperationalDateLimits().min}
          />
          
          <div className="space-y-1">
            <Input 
              label="Nota Fiscal" 
              mask="metric"
              placeholder="Informe o Nº da NF" 
              value={form.notaFiscal} 
              onChange={(e: any) => setForm({ ...form, notaFiscal: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Input 
                label="Litros (L)" 
                mask="decimal"
                placeholder="Ex: 500" 
                value={form.litros} 
                onChange={(e: any) => setForm({ ...form, litros: e.target.value.replace('.', ',') })}
                required
              />
            </div>
            <div className="space-y-1">
              <Input 
                label="Valor Unitário" 
                mask="decimal"
                placeholder="Ex: 6,45" 
                value={form.valorUnitario} 
                onChange={(e: any) => setForm({ ...form, valorUnitario: e.target.value.replace('.', ',') })}
                required
              />
            </div>
          </div>

          {/* FRETE OPCIONAL */}
          <div className="border-t pt-2">
            <button type="button" onClick={() => setShowFrete(!showFrete)} className="text-xs font-bold text-green-600 flex items-center gap-1 hover:text-green-600 mb-2">
              Frete (Opcional) {showFrete ? <Minus className="w-3 h-3"/> : <Plus className="w-3 h-3"/>}
            </button>
            {showFrete && (
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2 rounded-lg animate-in slide-in-from-top-1">
                <Input label="NF Frete" mask="metric" placeholder="Nº da NF Frete" value={form.nfFrete} onChange={(e:any) => setForm({ ...form, nfFrete: e.target.value })} />
                <Input label="Valor Frete (R$)" mask="currency" placeholder="Ex: 150,00" value={form.valorFrete} onChange={(e:any) => setForm({ ...form, valorFrete: e.target.value.replace('.', ',') })} />
              </div>
            )}
          </div>

          <div className="bg-green-100 border border-green-300 p-3 rounded-lg text-center">
            <p className="text-xs font-bold text-green-600 uppercase">Custo Total (Combustível + Frete)</p>
            <p className="text-xl font-black text-green-800">R$ {U.formatValue(form.valorTotal)}</p>
          </div>
          
          <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">Registrar Compra</button>
        </form>

        {/* HISTÓRICO DE COMPRAS (ÚLTIMAS 5) */}
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1"><Check className="w-3 h-3"/> Últimas 5 Compras</p>
          {ultimasCompras.length === 0 ? <p className="text-xs text-gray-400 italic">Nenhuma compra recente.</p> : 
            ultimasCompras.map((c:any) => (
              <div key={c.id} className="text-xs flex justify-between py-2 border-b last:border-0 border-gray-200">
                <span className="text-gray-600">{U.formatDate(c.data)}</span>
                <span className="font-bold text-gray-800">{c.litros} L</span>
                <span className="font-bold text-green-700">R$ {U.formatValue(c.valorTotal)}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
