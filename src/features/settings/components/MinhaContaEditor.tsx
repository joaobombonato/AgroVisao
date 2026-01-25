import React, { useState, useEffect, useRef, memo } from 'react';
import { User, Mail, Calendar, Phone, Shield, Camera, Save, Loader2, Check, X, Info, CreditCard, Move, ZoomOut, ZoomIn, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { supabase } from '../../../supabaseClient';
import { toast } from 'react-hot-toast';

// Componente de Input movido para FORA para evitar perda de foco ao digitar
const InputField = memo(({ label, icon: Icon, value, onChange, type = "text", placeholder, readOnly = false, className = '' }: any) => (
    <div className={`space-y-1.5 ${className}`}>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            <Icon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input 
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold text-gray-700 ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
            />
        </div>
    </div>
));

export default function MinhaContaEditor() {
    const { state, session, dispatch } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [isAdjusting, setIsAdjusting] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        data_nascimento: '',
        cnh_numero: '',
        cnh_vencimento: '',
        funcao: '',
        avatar_url: ''
    });

    const [adjustConfig, setAdjustConfig] = useState({
        zoom: 1.5, // Começa com um pouco de zoom para preencher melhor
        offsetX: 0,
        offsetY: 0,
        rawImage: ''
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (session?.user) {
            loadProfile();
        }
    }, [session]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session?.user?.id)
                .single();

            if (error) throw error;
            if (data) {
                setFormData({
                    full_name: data.full_name || data.nome || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    data_nascimento: data.data_nascimento || '',
                    cnh_numero: data.config?.cnh_numero || '',
                    cnh_vencimento: data.config?.cnh_vencimento || '',
                    funcao: data.funcao || '',
                    avatar_url: data.avatar_url || ''
                });
            }
        } catch (err: any) {
            console.error("Erro ao carregar perfil:", err);
            toast.error("Não foi possível carregar seus dados.");
        } finally {
            setLoading(false);
        }
    };

    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        const getSignedUrl = async () => {
            if (!formData.avatar_url) {
                setPreviewUrl('');
                return;
            }
            // Se for URL externa (ex: google auth), usa direto
            if (formData.avatar_url.startsWith('http')) {
                setPreviewUrl(formData.avatar_url);
                return;
            }
            // Se for apenas o path, gera signed URL (Bucket Privado)
            try {
                const { data } = await supabase.storage
                    .from('avatars')
                    .createSignedUrl(formData.avatar_url, 3600); // 1 hora de validade
                
                setPreviewUrl(data?.signedUrl || '');
            } catch (e) {
                console.error("Erro signed URL:", e);
            }
        };
        getSignedUrl();
    }, [formData.avatar_url]);

    const handleSave = async () => {
        try {
            setLoading(true);
            const updates = {
                full_name: formData.full_name,
                phone: formData.phone,
                data_nascimento: formData.data_nascimento,
                funcao: formData.funcao,
                avatar_url: formData.avatar_url,
                config: {
                    cnh_numero: formData.cnh_numero,
                    cnh_vencimento: formData.cnh_vencimento
                },
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', session?.user?.id);

            if (error) {
                // Se o erro for cache de schema, tentamos dar um refresh (hack suave)
                if (error.code === 'PGRST204') {
                    try { await supabase.rpc('notify_pgrst_reload'); } catch (e) {}
                    // Tenta salvar de novo sem o updated_at se falhar feio
                    delete (updates as any).updated_at;
                    const { error: retryError } = await supabase.from('profiles').update(updates).eq('id', session?.user?.id);
                    if (retryError) throw retryError;
                } else {
                    throw error;
                }
            }
            toast.success("Perfil atualizado com sucesso!");
        } catch (err: any) {
            console.error("Erro ao salvar perfil:", err);
            toast.error("Erro ao salvar alterações.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Imagem muito grande. Limite de 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setAdjustConfig({
                zoom: 1.5,
                offsetX: 0,
                offsetY: 0,
                rawImage: reader.result as string
            });
            setIsAdjusting(true);
        };
        reader.readAsDataURL(file);
    };

    const handleApplyAdjustment = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !adjustConfig.rawImage) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = adjustConfig.rawImage;
        img.onload = async () => {
            // Garantir que trabalhamos sempre em 400x400
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const size = canvas.width;
            const aspect = img.width / img.height;
            
            let drawW, drawH;
            
            // Lógica para preencher o canvas (Cover)
            if (aspect > 1) {
                drawH = size * adjustConfig.zoom;
                drawW = drawH * aspect;
            } else {
                drawW = size * adjustConfig.zoom;
                drawH = drawW / aspect;
            }

            const startX = (size - drawW) / 2 + (adjustConfig.offsetX * adjustConfig.zoom);
            const startY = (size - drawH) / 2 + (adjustConfig.offsetY * adjustConfig.zoom);

            ctx.drawImage(img, startX, startY, drawW, drawH);

            // Converter canvas para Blob para upload
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    toast.error("Erro ao processar imagem.");
                    return;
                }

                try {
                    setLoading(true);
                    const filePath = `${session?.user?.id}/${Date.now()}.jpg`;

                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

                    if (uploadError) throw uploadError;

                    setFormData(prev => ({ ...prev, avatar_url: filePath }));
                    setIsAdjusting(false);
                    toast.success("Foto processada com sucesso!");
                } catch (err: any) {
                    console.error("Erro no upload:", err);
                    toast.error("Erro ao enviar imagem.");
                } finally {
                    setLoading(false);
                }
            }, 'image/jpeg', 0.8);
        };
    };

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
        setAdjustConfig(prev => ({ 
            ...prev, 
            offsetX: touch.clientX - dragStart.x, 
            offsetY: touch.clientY - dragStart.y 
        }));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Modal de Ajuste de Imagem */}
            {isAdjusting && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 text-sm">Ajustar Foto de Perfil</h3>
                            <button onClick={() => setIsAdjusting(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="flex-1 p-5 flex flex-col items-center gap-5">
                            <div 
                                className={`w-44 h-44 rounded-full border-4 border-dashed border-indigo-500 relative overflow-hidden bg-gray-100 cursor-move select-none ${isDragging ? 'ring-4 ring-indigo-100' : ''}`}
                                onMouseDown={onStartDrag}
                                onMouseMove={onMoveDrag}
                                onMouseUp={() => setIsDragging(false)}
                                onMouseLeave={() => setIsDragging(false)}
                                onTouchStart={onStartDrag}
                                onTouchMove={onMoveDrag}
                                onTouchEnd={() => setIsDragging(false)}
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
                                {/* Overlay circular para guiar o usuário */}
                                <div className="absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(255,255,255,0.4)] pointer-events-none"></div>
                            </div>

                            <div className="w-full space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                                        <ZoomOut className="w-3 h-3"/>
                                        <span>Zoom: {(adjustConfig.zoom * 100).toFixed(0)}%</span>
                                        <ZoomIn className="w-3 h-3"/>
                                    </div>
                                    <input 
                                        type="range" min="0.5" max="5" step="0.01"
                                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        value={adjustConfig.zoom}
                                        onChange={e => setAdjustConfig(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                                    />
                                </div>

                                <div className="flex justify-center gap-2">
                                    <button onClick={() => setAdjustConfig(prev => ({ ...prev, offsetX: 0, offsetY: 0, zoom: 1.5 }))} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-[10px] uppercase">Resetar</button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex gap-2">
                            <button onClick={() => setIsAdjusting(false)} className="flex-1 py-3 text-xs font-bold text-gray-400">Cancelar</button>
                            <button 
                                onClick={handleApplyAdjustment}
                                disabled={loading}
                                className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />} Aplicar
                            </button>
                        </div>
                    </div>
                    <canvas ref={canvasRef} width={400} height={400} className="hidden" />
                </div>
            )}

            {/* Cabeçalho de Perfil */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full border-4 border-gray-50 overflow-hidden bg-indigo-50 flex items-center justify-center shadow-inner">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-indigo-200" />
                        )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white cursor-pointer active:scale-90 transition-all">
                        <Camera className="w-4 h-4" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageFileSelect} disabled={loading} />
                    </label>
                </div>
                {formData.avatar_url && !formData.avatar_url.startsWith('http') && (
                    <button 
                        onClick={() => setIsAdjusting(true)}
                        className="mt-3 text-[10px] font-black text-indigo-600 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors uppercase tracking-widest"
                    >
                        <Move className="w-3 h-3"/> Ajustar Foto
                    </button>
                )}
                <h3 className="mt-4 font-bold text-gray-800 text-lg">{formData.full_name || 'Seu Nome'}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{formData.funcao || 'Membro da Equipe'}</p>
            </div>

            {/* Formulário Principal */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <h4 className="font-bold text-gray-800 text-sm tracking-tight border-b border-gray-50 pb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" /> Meus Dados Pessoais
                </h4>

                <InputField 
                    label="Nome Completo" 
                    icon={User} 
                    value={formData.full_name} 
                    onChange={(e:any) => setFormData({...formData, full_name: e.target.value})} 
                />

                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="E-mail (Login)" 
                        icon={Mail} 
                        value={formData.email} 
                        readOnly={true}
                        className="opacity-50"
                    />
                    <InputField 
                        label="Telefone / WhatsApp" 
                        icon={Phone} 
                        value={formData.phone} 
                        onChange={(e:any) => setFormData({...formData, phone: e.target.value})} 
                        placeholder="(00) 00000-0000"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="Data Nascimento" 
                        icon={Calendar} 
                        type="date"
                        value={formData.data_nascimento} 
                        onChange={(e:any) => setFormData({...formData, data_nascimento: e.target.value})} 
                    />
                    <InputField 
                        label="Sua Função" 
                        icon={Shield} 
                        value={formData.funcao} 
                        onChange={(e:any) => setFormData({...formData, funcao: e.target.value})} 
                        placeholder="Ex: Agrônomo"
                    />
                </div>
            </div>

            {/* Documentos Relacionados */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <h4 className="font-bold text-gray-800 text-sm tracking-tight border-b border-gray-50 pb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" /> Documentação Técnica
                </h4>

                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="Número da CNH" 
                        icon={CreditCard} 
                        value={formData.cnh_numero} 
                        onChange={(e:any) => setFormData({...formData, cnh_numero: e.target.value})} 
                        placeholder="00000000000"
                    />
                    <InputField 
                        label="Vencimento CNH" 
                        icon={Calendar} 
                        type="date"
                        value={formData.cnh_vencimento} 
                        onChange={(e:any) => setFormData({...formData, cnh_vencimento: e.target.value})} 
                    />
                </div>
                <p className="text-[9px] text-gray-400 italic">O sistema irá te alertar automaticamente 30 dias antes do vencimento da sua CNH.</p>
            </div>

            <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-[2rem] shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvar Meu Perfil
            </button>
        </div>
    );
}
