import React from 'react';
import { Plus, X, Save, BarChart3, LineChart, PieChart } from 'lucide-react';

interface BIEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    newChart: {
        name: string;
        eixoX: string;
        eixoY: string;
        tipo: string;
    };
    setNewChart: (chart: any) => void;
}

export function BIEditorModal({ isOpen, onClose, onSave, newChart, setNewChart }: BIEditorModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-purple-50 rounded-t-2xl">
                    <h3 className="font-black text-purple-800 flex items-center gap-2"><Plus className="w-5 h-5"/> Criar Indicador BI</h3>
                    <button onClick={onClose} className="text-purple-800"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nome do Indicador</label>
                        <input 
                            type="text" 
                            className="w-full border-2 p-2 rounded-lg focus:border-purple-500 outline-none font-bold" 
                            placeholder="Ex: Gasto por Máquina" 
                            value={newChart.name} 
                            onChange={e => setNewChart({...newChart, name: e.target.value})} 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Eixo X (Base)</label>
                          <select 
                              className="w-full border-2 p-2 rounded-lg text-sm font-bold bg-gray-50" 
                              value={newChart.eixoX} 
                              onChange={e => setNewChart({...newChart, eixoX: e.target.value})}
                          >
                              <option>Data</option>
                              <option>Máquina</option>
                              <option>Centro de Custo</option>
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Eixo Y (Valor)</label>
                          <select 
                              className="w-full border-2 p-2 rounded-lg text-sm font-bold bg-gray-50" 
                              value={newChart.eixoY} 
                              onChange={e => setNewChart({...newChart, eixoY: e.target.value})}
                          >
                              <option>Valor R$</option>
                              <option>Litros</option>
                              <option>Consumo (kwh/L)</option>
                          </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tipo de Visualização</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Barra', 'Linha', 'Pizza'].map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => setNewChart({...newChart, tipo: t})} 
                                    className={`py-2 rounded-lg border-2 text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${newChart.tipo === t ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-gray-100 text-gray-400'}`}
                                >
                                    {t === 'Barra' && <BarChart3 className="w-4 h-4"/>}
                                    {t === 'Linha' && <LineChart className="w-4 h-4"/>}
                                    {t === 'Pizza' && <PieChart className="w-4 h-4"/>}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button 
                        onClick={onSave} 
                        className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <Save className="w-5 h-5"/> Salvar no Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
