import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export function SearchableSelect({ label, value, onChange, options = [], placeholder, required = false, color = 'blue' }: any) {
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

    const filteredOptions = (Array.isArray(options) ? options : []).filter((opt: any) => {
        const searchText = search.toLowerCase();
        
        if (typeof opt === 'string') {
            return opt.toLowerCase().includes(searchText);
        }
        
        // Busca em múltiplos campos para garantir que "Trator" ou "Modelo" sejam encontrados
        const label = (opt.label || '').toLowerCase();
        const nome = (opt.nome || '').toLowerCase();
        const descricao = (opt.descricao || '').toLowerCase();
        const fabricante = (opt.fabricante || '').toLowerCase();
        const value = (opt.value || '').toLowerCase();

        return label.includes(searchText) || 
               nome.includes(searchText) || 
               descricao.includes(searchText) || 
               fabricante.includes(searchText) ||
               value.includes(searchText);
    });

    const handleSelect = (opt: any) => {
        const val = typeof opt === 'string' ? opt : (opt.label || opt.nome);
        // Passa o valor string E o objeto completo (data)
        onChange({ target: { value: val, data: opt } });
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="space-y-1 relative" ref={wrapperRef}>
            <p className="text-xs font-medium text-gray-600">{label} {required && <span className="text-red-500">*</span>}</p>
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
                            const text = typeof opt === 'string' ? opt : (opt.label || opt.nome);
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
