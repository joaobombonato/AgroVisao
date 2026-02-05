import React, { useState, useEffect, useRef, memo } from 'react';
import { User, Mail, Calendar, Phone, Shield, Save, Loader2, Info, CreditCard } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { supabase } from '../../../supabaseClient';
import { toast } from 'react-hot-toast';
import { ImageAdjustModal } from './ImageAdjustModal';
import { ProfileHeader } from './ProfileHeader';

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
                max={type === "date" ? "9999-12-31" : undefined}
            />
        </div>
    </div>
));

export default function MinhaContaEditor() {
    const { session, dispatch } = useAppContext();
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
        zoom: 1.5,
        offsetX: 0,
        offsetY: 0,
        rawImage: ''
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        if (session?.user) loadProfile();
    }, [session]);

    useEffect(() => {
        const getSignedUrl = async () => {
            if (!formData.avatar_url) {
                setPreviewUrl('');
                return;
            }
            if (formData.avatar_url.startsWith('http')) {
                setPreviewUrl(formData.avatar_url);
                return;
            }
            try {
                const { data } = await supabase.storage
                    .from('avatars')
                    .createSignedUrl(formData.avatar_url, 3600);
                setPreviewUrl(data?.signedUrl || '');
            } catch (e) {
                console.error("Erro signed URL:", e);
            }
        };
        getSignedUrl();
    }, [formData.avatar_url]);

    const applyPhoneMask = (v: string) => {
        v = v.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        if (v.length > 6) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
        if (v.length > 2) return v.replace(/(\d{2})(\d{0,4})/, "($1) $2");
        return v;
    };

    const applyCNHMask = (v: string) => {
        v = v.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
        if (v.length > 3) return v.replace(/(\d{3})(\d{0,3})/, "$1.$2");
        return v;
    };

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

    const handleSave = async () => {
        try {
            setLoading(true);
            const updates = {
                full_name: formData.full_name,
                phone: formData.phone.replace(/\D/g, ''),
                data_nascimento: formData.data_nascimento,
                funcao: formData.funcao,
                avatar_url: formData.avatar_url,
                config: {
                    cnh_numero: formData.cnh_numero.replace(/\D/g, ''),
                    cnh_vencimento: formData.cnh_vencimento
                },
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', session?.user?.id);

            if (error) {
                if (error.code === 'PGRST204') {
                    try { await supabase.rpc('notify_pgrst_reload'); } catch (e) {}
                    delete (updates as any).updated_at;
                    const { error: retryError } = await supabase.from('profiles').update(updates).eq('id', session?.user?.id);
                    if (retryError) throw retryError;
                } else {
                    throw error;
                }
            }

            const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session?.user?.id)
                .single();

            if (updatedProfile) {
                dispatch({ type: ACTIONS.UPDATE_USER_PROFILE, profile: updatedProfile });
            }

            toast.success("Perfil atualizado com sucesso!");
        } catch (err: any) {
            console.error("Erro ao salvar perfil:", err);
            toast.error("Erro ao salvar alterações.");
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (field: string, value: string) => {
        if (value.length > 10) value = value.slice(0, 10);
        setFormData(prev => ({ ...prev, [field]: value }));
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
            setAdjustConfig({ zoom: 1.5, offsetX: 0, offsetY: 0, rawImage: reader.result as string });
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
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const size = canvas.width;
            const aspect = img.width / img.height;
            
            let drawW, drawH;
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <ImageAdjustModal 
                isOpen={isAdjusting}
                onClose={() => setIsAdjusting(false)}
                loading={loading}
                adjustConfig={adjustConfig}
                setAdjustConfig={setAdjustConfig}
                onApply={handleApplyAdjustment}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                dragStart={dragStart}
                setDragStart={setDragStart}
                canvasRef={canvasRef}
            />

            <ProfileHeader 
                previewUrl={previewUrl}
                fullName={formData.full_name}
                funcao={formData.funcao}
                avatarUrl={formData.avatar_url}
                loading={loading}
                onFileSelect={handleImageFileSelect}
                onAdjustClick={() => setIsAdjusting(true)}
            />

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
                        onChange={(e:any) => setFormData({...formData, phone: applyPhoneMask(e.target.value)})} 
                        placeholder="(00) 00000-0000"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="Data Nascimento" 
                        icon={Calendar} 
                        type="date"
                        value={formData.data_nascimento} 
                        onChange={(e:any) => handleDateChange('data_nascimento', e.target.value)} 
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
                        onChange={(e:any) => setFormData({...formData, cnh_numero: applyCNHMask(e.target.value)})} 
                        placeholder="000.000.000-00"
                    />
                    <InputField 
                        label="Vencimento CNH" 
                        icon={Calendar} 
                        type="date"
                        value={formData.cnh_vencimento} 
                        onChange={(e:any) => handleDateChange('cnh_vencimento', e.target.value)} 
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
