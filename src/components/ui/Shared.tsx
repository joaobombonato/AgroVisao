import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trash2, ChevronDown, MoreHorizontal, FilePen, X, Check, X as XClose, Search } from 'lucide-react';
import { U } from '../../data/utils';

// --- STYLES ---
export const GlobalStyles = () => (
    <style>{`
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      input[type=number]::-webkit-inner-spin-button, 
      input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }
    `}</style>
);

// --- HEADER ---
export const PageHeader = ({ setTela, title, icon: Icon, colorClass, backTarget = 'principal' }: any) => (
  <div className="flex items-center justify-between mb-4 pb-2 border-b">
    <div className="flex items-center gap-2">
       <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
       <h1 className="text-xl font-bold text-gray-800">{title}</h1>
    </div>
    <button onClick={() => setTela(backTarget)} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors"><ArrowLeft className="w-4 h-4 ml-1" /> Voltar</button>
  </div>
);

// --- INPUTS ---
export const Input = ({ label, readOnly, ...props }: any) => (
  <div className="space-y-1">
    <p className="text-xs font-medium text-gray-600">{label}</p>
    <input {...props} className={`w-full px-3 py-2 border-2 rounded-lg transition-colors ${readOnly ? 'bg-gray-100 text-gray-600 font-semibold border-gray-300 cursor-not-allowed' : 'border-gray-200 focus:border-blue-500 bg-white'}`} readOnly={readOnly} />
  </div>
);

export const Select = ({ label, children, ...props }: any) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600">{label}</p>
        <select {...props} className="w-full px-3 py-2 border-2 rounded-lg bg-white border-gray-200 focus:border-blue-500">{children}</select>
    </div>
);

// --- SEARCHABLE SELECT (AGORA COM CORES DINÂMICAS) ---
export function SearchableSelect({ label, value, onChange, options, placeholder, required = false, color = 'blue' }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<any>(null);

    // Mapa de cores para replicar o design original
    const colors: any = {
        blue:   { borderFocus: 'border-blue-500', ring: 'ring-blue-500', bgHover: 'hover:bg-blue-50', textSelected: 'text-blue-700', bgSelected: 'bg-blue-50' },
        red:    { borderFocus: 'border-red-500',  ring: 'ring-red-500',  bgHover: 'hover:bg-red-50',  textSelected: 'text-red-700',  bgSelected: 'bg-red-50' },
        orange: { borderFocus: 'border-orange-500', ring: 'ring-orange-500', bgHover: 'hover:bg-orange-50', textSelected: 'text-orange-700', bgSelected: 'bg-orange-50' },
        green:  { borderFocus: 'border-green-500', ring: 'ring-green-500', bgHover: 'hover:bg-green-50', textSelected: 'text-green-700', bgSelected: 'bg-green-50' },
        purple: { borderFocus: 'border-purple-500', ring: 'ring-purple-500', bgHover: 'hover:bg-purple-50', textSelected: 'text-purple-700', bgSelected: 'bg-purple-50' },
        yellow: { borderFocus: 'border-yellow-500', ring: 'ring-yellow-500', bgHover: 'hover:bg-yellow-50', textSelected: 'text-yellow-700', bgSelected: 'bg-yellow-50' },
        cyan:   { borderFocus: 'border-cyan-500', ring: 'ring-cyan-500', bgHover: 'hover:bg-cyan-50', textSelected: 'text-cyan-700', bgSelected: 'bg-cyan-50' },
    };
    const theme = colors[color] || colors.blue;

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = options.filter((opt: any) => {
        const text = typeof opt === 'string' ? opt : opt.nome || '';
        return text.toLowerCase().includes(search.toLowerCase());
    });

    const handleSelect = (opt: any) => {
        const val = typeof opt === 'string' ? opt : opt.nome;
        onChange({ target: { value: val } });
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="space-y-1 relative" ref={wrapperRef}>
            <p className="text-xs font-medium text-gray-600">{label} {required && '*'}</p>
            <div 
                className={`w-full px-3 py-2 border-2 rounded-lg bg-white flex justify-between items-center cursor-pointer transition-colors ${isOpen ? `${theme.borderFocus} ring-1 ${theme.ring}` : 'border-gray-200'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`text-sm ${!value ? 'text-gray-400' : 'text-gray-800'}`}>
                    {value || placeholder || 'Selecione...'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400"/>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 sticky top-0 bg-white border-b">
                        <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border">
                            <Search className="w-4 h-4 text-gray-400"/>
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Buscar..." 
                                className="bg-transparent w-full text-sm outline-none"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt: any, idx: number) => {
                            const text = typeof opt === 'string' ? opt : opt.nome;
                            const isSelected = value === text;
                            return (
                                <div 
                                    key={idx} 
                                    className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center ${theme.bgHover} ${isSelected ? `${theme.bgSelected} ${theme.textSelected} font-bold` : 'text-gray-700'}`}
                                    onClick={() => handleSelect(opt)}
                                >
                                    {text}
                                    {isSelected && <Check className="w-4 h-4"/>}
                                </div>
                            )
                        })
                    ) : (
                        <div className="p-3 text-center text-xs text-gray-400">Sem resultados</div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- MODALS ---
export const ConfirmModal = ({ message, onConfirm, onClose }: any) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-lg w-full max-w-xs shadow-2xl">
      <div className="p-4 border-b"><h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Confirmação</h3></div>
      <div className="p-4"><p className="text-gray-700">{message}</p></div>
      <div className="p-4 flex justify-end gap-3 border-t">
        <button onClick={onClose} className="px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 font-medium">Cancelar</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors">Confirmar</button>
      </div>
    </div>
  </div>
);

export const OSDetailsModal = ({ os, onClose, onUpdateStatus }: any) => {
    if (!os) return null;
    const getStatusColor = (s:string) => s === 'Pendente' ? 'bg-yellow-500' : s === 'Confirmado' ? 'bg-green-500' : 'bg-red-500';
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Detalhes da OS</h3>
                    <button onClick={onClose}><XClose className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <div><p className="text-2xl font-bold text-gray-800">{os.id}</p><p className="text-sm text-gray-500">{U.formatDate(os.data)}</p></div>
                        <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${getStatusColor(os.status)}`}>{os.status}</span>
                    </div>
                    <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Módulo</p><p className="font-medium">{os.modulo}</p></div>
                        <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Descrição Resumida</p><p className="font-medium">{os.descricao}</p></div>
                        {os.detalhes && (
                            <div className="border-t pt-3 mt-3">
                                <p className="text-sm font-bold mb-2">Dados Completos:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(os.detalhes).map(([key, value]) => {
                                        if (key === 'id' || key === 'data' || !value) return null;
                                        return (<div key={key} className="bg-gray-50 p-2 rounded"><p className="text-[10px] text-gray-500 uppercase">{key}</p><p className="text-sm font-medium truncate" title={value as string}>{String(value)}</p></div>)
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex gap-3">
                    <button onClick={() => { onUpdateStatus(os.id, 'Cancelado'); onClose(); }} className="flex-1 py-3 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 flex items-center justify-center gap-2"><X className="w-5 h-5"/> Cancelar</button>
                    <button onClick={() => { onUpdateStatus(os.id, 'Confirmado'); onClose(); }} className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"><Check className="w-5 h-5"/> Confirmar</button>
                </div>
            </div>
        </div>
    )
};

// --- TABLE ---
const TableRowWithAction = ({ children, onDelete, onEdit }: any) => {
    const [showActions, setShowActions] = useState(false);
    return (
        <tr className="hover:bg-gray-50 border-t">
            {children}
            <td className="px-3 py-2 text-right relative">
                {showActions ? (
                    <div className="flex justify-end gap-2 animate-in fade-in zoom-in duration-200 absolute right-2 top-2 bg-white shadow-md p-1 rounded border z-10">
                        <button onClick={() => { onEdit && onEdit(); setShowActions(false); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><FilePen className="w-4 h-4"/></button>
                        <button onClick={() => { onDelete && onDelete(); setShowActions(false); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                        <button onClick={() => setShowActions(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4"/></button>
                    </div>
                ) : (
                    <button onClick={() => setShowActions(true)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                )}
            </td>
        </tr>
    )
}

export const TableWithShowMore = ({ children, data, limit = 5 }: any) => {
    const [visible, setVisible] = useState(limit);
    const hasMore = data.length > visible;
    return (
        <>
            <div className="overflow-x-auto no-scrollbar pb-2">
                <table className="w-full text-sm min-w-[350px]">
                    {/* Renderiza passando o Componente de Linha Personalizada */}
                    {children(data.slice(0, visible), TableRowWithAction)}
                </table>
            </div>
            {hasMore && (<button onClick={() => setVisible((prev:number) => prev + 5)} className="w-full py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 border-t flex items-center justify-center gap-1">Ver mais <ChevronDown className="w-3 h-3"/></button>)}
        </>
    );
};