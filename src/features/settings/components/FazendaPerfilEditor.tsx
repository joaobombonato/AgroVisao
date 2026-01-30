import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Building2, MapPin, User, Ruler, Loader2, ZoomIn, ZoomOut, Move, Check, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { dbService } from '../../../services';

export default function FazendaPerfilEditor() {
    const { fazendaId, fazendaSelecionada, dispatch, fazendasDisponiveis, setFazendaSelecionada } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [isAdjusting, setIsAdjusting] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Estado local do form
    const [formData, setFormData] = useState({
        nome: '',
        tamanho_ha: '',
        cidade: '',
        estado: '',
        proprietario: '',
        latitude: null as number | null,
        longitude: null as number | null,
        microregiao: '',
        mesoregiao: '',
        regiao_imediata: '',
        rec_code: '',
        logo_url: '' // Base64 final
    });

    const [estados, setEstados] = useState<any[]>([]);
    const [municipios, setMunicipios] = useState<any[]>([]);
    const [loadingLoc, setLoadingLoc] = useState(false);

    // Estados de ajuste (Zoom e Pan)
    const [adjustConfig, setAdjustConfig] = useState({
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        rawImage: ''
    });

    // Estados para Drag-and-Drop
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Carregar dados ao montar
    useEffect(() => {
        if (fazendaSelecionada) {
            setFormData({
                nome: fazendaSelecionada.nome || '',
                tamanho_ha: fazendaSelecionada.tamanho_ha || '',
                cidade: fazendaSelecionada.cidade || '',
                estado: fazendaSelecionada.estado || '',
                proprietario: fazendaSelecionada.proprietario || '',
                latitude: fazendaSelecionada.latitude || null,
                longitude: fazendaSelecionada.longitude || null,
                microregiao: fazendaSelecionada.config?.regional?.microregiao || '',
                mesoregiao: fazendaSelecionada.config?.regional?.mesoregiao || '',
                regiao_imediata: fazendaSelecionada.config?.regional?.regiao_imediata || '',
                rec_code: fazendaSelecionada.config?.regional?.rec || '',
                logo_url: fazendaSelecionada.config?.logo_base64 || ''
            });
            if (fazendaSelecionada.config?.logo_base64) {
                setAdjustConfig(prev => ({ ...prev, rawImage: fazendaSelecionada.config.logo_base64 }));
            }
        }
    }, [fazendaSelecionada]);

    // Load Estados on Mount
    useEffect(() => {
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
          .then(res => res.json())
          .then(data => setEstados(data))
          .catch(err => console.error("Erro IBGE Estados:", err));
    }, []);

    // Load Municipios when Estado changes (ou ao carregar inicial se tiver estado)
    useEffect(() => {
        if (!formData.estado) {
            setMunicipios([]);
            return;
        }
        setLoadingLoc(true);
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.estado}/municipios`)
          .then(res => res.json())
          .then(data => setMunicipios(data))
          .catch(err => console.error("Erro IBGE Municipios:", err))
          .finally(() => setLoadingLoc(false));
    }, [formData.estado]);

    const getREC = (municipio: any) => {
        const uf = municipio['microrregiao']?.['mesorregiao']?.['UF']?.sigla;
        const mesoId = String(municipio['microrregiao']?.['mesorregiao']?.id);
        if (uf === 'MG') {
            if (mesoId === '3101') return 'M3 - 304';
            if (mesoId === '3105') return 'M3 - 301';
            if (mesoId === '3102') return 'M3 - 303';
        }
        if (uf === 'GO') {
            if (['5204', '5205'].includes(mesoId)) return 'M3 - 301';
            if (['5201', '5202', '5203'].includes(mesoId)) return 'M3 - 302';
        }
        if (uf === 'MT') {
            if (mesoId === '5101' || mesoId === '5102') return 'M4 - 401';
            if (mesoId === '5105') return 'M3 - 304';
            if (mesoId === '5104') return 'M4 - 402';
        }
        if (uf === 'MS') {
            if (mesoId === '5001') return 'M3 - 302';
            if (['5004', '5003'].includes(mesoId)) return 'M2 - 204';
        }
        if (uf === 'PR') {
            if (['4101', '4102', '4106'].includes(mesoId)) return 'M2 - 201';
            if (['4103', '4105'].includes(mesoId)) return 'M2 - 202';
        }
        if (['BA', 'PI', 'MA', 'TO'].includes(uf)) return 'M5 - 501';
        if (uf === 'RS') {
            if (['4301', '4302'].includes(mesoId)) return 'M1 - 102';
            if (mesoId === '4305') return 'M1 - 101';
        }
        return '';
    };

    const handleSelectMunicipio = (mId: string) => {
        const mun = municipios.find(m => String(m.id) === mId);
        if (mun) {
            const rec = getREC(mun);
            setFormData(prev => ({
                ...prev,
                cidade: mun.nome,
                microregiao: mun['microrregiao']?.nome || '',
                mesoregiao: mun['microrregiao']?.['mesorregiao']?.nome || '',
                regiao_imediata: mun['regiao-imediata']?.nome || '',
                rec_code: rec
            }));
        }
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocalização não suportada.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setFormData(prev => ({ ...prev, latitude, longitude }));
                toast.success("GPS sincronizado!");
            },
            () => toast.error("Falha no GPS."),
            { enableHighAccuracy: true }
        );
    };

    const handleGeocode = async () => {
        if (!formData.cidade || !formData.estado) {
          toast.error("Selecione Estado e Cidade primeiro.");
          return;
        }
        setLoadingLoc(true);
        try {
          const query = `${formData.cidade}, ${formData.estado}, Brasil`;
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
          const data = await res.json();
    
          if (data && data.length > 0) {
            const { lat, lon } = data[0];
            setFormData(prev => ({ 
                ...prev, 
                latitude: parseFloat(lat), 
                longitude: parseFloat(lon) 
            }));
            toast.success("Localização encontrada!");
          } else {
            toast.error("Cidade não encontrada no mapa.");
          }
        } catch (err) {
          console.error(err);
          toast.error("Erro ao buscar coordenadas.");
        } finally {
          setLoadingLoc(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("A imagem original deve ter no máximo 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            
            // Calcular zoom inicial para a imagem ocupar bem o container
            const img = new Image();
            img.src = base64String;
            img.onload = () => {
                const uiSize = 176; // w-44
                const initialZoom = Math.max(uiSize / img.width, uiSize / img.height) * 1.2;
                
                setAdjustConfig({
                    zoom: initialZoom,
                    offsetX: 0,
                    offsetY: 0,
                    rawImage: base64String
                });
                setIsAdjusting(true);
            };
        };
        reader.readAsDataURL(file);
    };

    const handleApplyAdjustment = () => {
        const canvas = canvasRef.current;
        if (!canvas || !adjustConfig.rawImage) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = adjustConfig.rawImage;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const canvasSize = canvas.width; // 400
            const uiSize = 176; // w-44
            const ratio = canvasSize / uiSize;

            // O que o usuário vê na UI: (img.width * zoom) px em um container de 176px
            // O que queremos no Canvas: (img.width * zoom * ratio) px em um container de 400px
            const drawW = img.width * adjustConfig.zoom * ratio;
            const drawH = img.height * adjustConfig.zoom * ratio;

            const startX = (canvasSize - drawW) / 2 + (adjustConfig.offsetX * ratio);
            const startY = (canvasSize - drawH) / 2 + (adjustConfig.offsetY * ratio);

            ctx.drawImage(img, startX, startY, drawW, drawH);

            const adjustedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            if (adjustedBase64.length > 250 * 1024) {
                 toast.error("A imagem ficou muito pesada. Tente reduzir o zoom.");
                 return;
            }

            setFormData(prev => ({ ...prev, logo_url: adjustedBase64 }));
            setIsAdjusting(false);
            toast.success("Ajuste aplicado!");
        };
    };

    // Lógica de Drag
    const onStartDrag = (e: any) => {
        setIsDragging(true);
        const touch = e.touches ? e.touches[0] : e;
        setDragStart({
            x: touch.clientX - adjustConfig.offsetX,
            y: touch.clientY - adjustConfig.offsetY
        });
    };

    const onMoveDrag = (e: any) => {
        if (!isDragging) return;
        const touch = e.touches ? e.touches[0] : e;
        const deltaX = touch.clientX - dragStart.x;
        const deltaY = touch.clientY - dragStart.y;
        setAdjustConfig(prev => ({ ...prev, offsetX: deltaX, offsetY: deltaY }));
    };

    const onEndDrag = () => {
        setIsDragging(false);
    };

    const handleSave = async () => {
        if (!fazendaId) return;
        setLoading(true);

        try {
            const updates = {
                nome: formData.nome,
                tamanho_ha: Number(formData.tamanho_ha) || 0,
                cidade: formData.cidade,
                estado: formData.estado,
                proprietario: formData.proprietario,
                latitude: formData.latitude,
                longitude: formData.longitude,
                config: {
                    ...(fazendaSelecionada?.config || {}),
                    logo_base64: formData.logo_url,
                    regional: {
                        microregiao: formData.microregiao,
                        mesoregiao: formData.mesoregiao,
                        regiao_imediata: formData.regiao_imediata,
                        rec: formData.rec_code
                    }
                }
            };

            await dbService.update('fazendas', fazendaId, updates, fazendaId);

            const novaFazenda = { ...fazendaSelecionada, ...updates };
            const novasFazendas = (fazendasDisponiveis || []).map((f: any) => 
                f.id === fazendaId ? novaFazenda : f
            );

            setFazendaSelecionada(novaFazenda); 
            dispatch({ 
                type: ACTIONS.SET_FAZENDA, 
                fazendaId: novaFazenda.id, 
                fazendaNome: novaFazenda.nome,
                fazendas: novasFazendas 
            });
           
            toast.success("Perfil da fazenda atualizado!");

        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Modal de Ajuste de Imagem */}
            {isAdjusting && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 text-sm tracking-tight">Ajustar Logotipo</h3>
                            <button onClick={() => setIsAdjusting(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center gap-5">
                            {/* Area de Visualização Quadrada (Interactiva) */}
                            <div 
                                className={`w-44 h-44 shrink-0 rounded-full border-4 border-dashed border-green-500 relative overflow-hidden bg-gray-100 flex items-center justify-center shadow-inner cursor-move select-none ${isDragging ? 'border-green-600 ring-4 ring-green-100' : ''}`}
                                onMouseDown={onStartDrag}
                                onMouseMove={onMoveDrag}
                                onMouseUp={onEndDrag}
                                onMouseLeave={onEndDrag}
                                onTouchStart={onStartDrag}
                                onTouchMove={onMoveDrag}
                                onTouchEnd={onEndDrag}
                            >
                                <img 
                                    src={adjustConfig.rawImage} 
                                    alt="Ajuste" 
                                    className="max-w-none transition-all duration-75 block pointer-events-none"
                                    style={{
                                        width: 'auto',
                                        height: 'auto',
                                        transformOrigin: 'center center',
                                        transform: `translate(${adjustConfig.offsetX}px, ${adjustConfig.offsetY}px) scale(${adjustConfig.zoom})`
                                    }}
                                />
                            </div>

                            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest text-center">
                                Arraste a imagem para centralizar
                            </p>

                            {/* Controles */}
                            <div className="w-full space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                                        <span className="flex items-center gap-1"><ZoomOut className="w-3 h-3"/> Zoom Out</span>
                                        <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{(adjustConfig.zoom * 100).toFixed(0)}%</span>
                                        <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3"/> Zoom In</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.1" 
                                        max="4" 
                                        step="0.01"
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                        value={adjustConfig.zoom}
                                        onChange={e => setAdjustConfig(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                                    />
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                     <div className="grid grid-cols-3 gap-1.5">
                                        <div />
                                        <button onClick={() => setAdjustConfig(prev => ({ ...prev, offsetY: prev.offsetY - 10 }))} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronUp className="w-4 h-4 text-gray-600"/></button>
                                        <div />
                                        <button onClick={() => setAdjustConfig(prev => ({ ...prev, offsetX: prev.offsetX - 10 }))} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronLeft className="w-4 h-4 text-gray-600"/></button>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const img = new Image();
                                                img.src = adjustConfig.rawImage;
                                                img.onload = () => {
                                                    const uiSize = 176;
                                                    const initialZoom = Math.max(uiSize / img.width, uiSize / img.height) * 1.2;
                                                    setAdjustConfig(prev => ({ ...prev, offsetX: 0, offsetY: 0, zoom: initialZoom }));
                                                };
                                            }} 
                                            className="w-14 h-9 flex items-center justify-center bg-green-600 text-white rounded-lg font-black text-[9px] shadow-md hover:bg-green-700 transition-all active:scale-95"
                                        >
                                            RESET
                                        </button>
                                        <button onClick={() => setAdjustConfig(prev => ({ ...prev, offsetX: prev.offsetX + 10 }))} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronRight className="w-4 h-4 text-gray-600"/></button>
                                        <div />
                                        <button onClick={() => setAdjustConfig(prev => ({ ...prev, offsetY: prev.offsetY + 10 }))} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronDown className="w-4 h-4 text-gray-600"/></button>
                                        <div />
                                     </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50/80 border-t flex gap-2">
                            <button 
                                onClick={() => setIsAdjusting(false)}
                                className="flex-1 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleApplyAdjustment}
                                className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-green-700 active:scale-95 transition-all text-xs"
                            >
                                <Check className="w-4 h-4" /> Aplicar
                            </button>
                        </div>
                    </div>
                    <canvas ref={canvasRef} width={400} height={400} className="hidden" />
                </div>
            )}

            {/* Layout Principal do Editor */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="relative group cursor-pointer">
                    <div className="w-32 h-32 rounded-full border-4 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner">
                        {formData.logo_url ? (
                            <img src={formData.logo_url} alt="Logo Fazenda" className="w-full h-full object-cover" />
                        ) : (
                            <Building2 className="w-12 h-12 text-gray-300" />
                        )}
                    </div>
                    
                    <label className="absolute bottom-0 right-0 bg-green-600 text-white p-2.5 rounded-full shadow-lg hover:bg-green-700 transition-colors cursor-pointer border-4 border-white">
                        <Camera className="w-5 h-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>
                {formData.logo_url && (
                    <button 
                        onClick={() => setIsAdjusting(true)}
                        className="mt-5 text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full transition-colors"
                    >
                        <Move className="w-3 h-3"/> Ajustar logotipo
                    </button>
                )}
                <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] text-center">Toque para selecionar a logo</p>
            </div>

            {/* Formulário de Dados */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-800 text-base tracking-tight border-b border-gray-50 pb-3 mb-4">Dados da Propriedade</h3>
                
                <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nome Oficial</label>
                     <div className="relative">
                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm font-semibold text-gray-700"
                            placeholder="Nome da fazenda"
                            value={formData.nome || ''}
                            onChange={e => setFormData({...formData, nome: e.target.value})}
                        />
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Área (ha)</label>
                         <div className="relative">
                            <Ruler className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input 
                                type="number" 
                                className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold text-gray-700"
                                placeholder="0.00"
                                value={formData.tamanho_ha || ''}
                                onChange={e => setFormData({...formData, tamanho_ha: e.target.value})}
                            />
                         </div>
                    </div>
                    <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Estado (UF)</label>
                         <select 
                            className="w-full px-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold text-gray-700"
                            value={formData.estado || ''}
                            onChange={e => setFormData({...formData, estado: e.target.value, cidade: ''})}
                        >
                            <option value="">Selecione...</option>
                            {estados.map(est => (
                                <option key={est.id} value={est.sigla}>{est.nome} ({est.sigla})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cidade</label>
                    <div className="flex gap-2">
                        <select 
                            className="w-full px-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold text-gray-700 disabled:opacity-50"
                            value={municipios.find(m => m.nome === formData.cidade)?.id || ''}
                            onChange={e => handleSelectMunicipio(e.target.value)}
                            disabled={!formData.estado || loadingLoc}
                        >
                            <option value="">{loadingLoc ? 'Carregando...' : 'Selecione a cidade'}</option>
                            {municipios.map(mun => (
                                <option key={mun.id} value={mun.id}>{mun.nome}</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleGeocode}
                            disabled={loadingLoc || !formData.cidade}
                            className="p-3 bg-green-100 text-green-700 rounded-2xl hover:bg-green-200 transition-colors disabled:opacity-50"
                            title="Buscar coordenadas da cidade"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Info Regional */}
                {formData.rec_code && (
                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <div className="bg-white p-1.5 rounded-xl shadow-sm">
                            <Search className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-[10px]">
                            <p className="font-bold text-blue-900 uppercase">Região Agronômica Detectada</p>
                            <p className="text-blue-700 font-bold">{formData.rec_code} ({formData.microregiao})</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Latitude</label>
                         <input 
                            type="text" 
                            readOnly
                            className="w-full px-4 py-3 border-0 bg-gray-100 rounded-2xl text-[10px] font-mono text-gray-500"
                            value={formData.latitude || 'Não capturada'}
                         />
                    </div>
                    <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Longitude</label>
                         <div className="relative">
                             <input 
                                type="text" 
                                readOnly
                                className="w-full px-4 py-3 border-0 bg-gray-100 rounded-2xl text-[10px] font-mono text-gray-500"
                                value={formData.longitude || 'Não capturada'}
                             />
                             <button 
                                onClick={handleCurrentLocation}
                                className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
                                title="Capturar GPS Atual"
                             >
                                <MapPin className="w-4 h-4" />
                             </button>
                         </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Proprietário / Responsável</label>
                     <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold text-gray-700"
                            placeholder="Nome do responsável"
                            value={formData.proprietario || ''}
                            onChange={e => setFormData({...formData, proprietario: e.target.value})}
                        />
                     </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-[2rem] shadow-lg hover:bg-green-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                Salvar Configurações
            </button>
        </div>
    );
}
