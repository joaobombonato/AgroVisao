import React, { useState, useEffect, memo } from 'react';
import { User, Mail, Calendar, Phone, Shield, Save, Loader2, Info, CreditCard } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { supabase } from '../../../supabaseClient';
import { toast } from 'react-hot-toast';
import { ImageAdjustModal } from './ImageAdjustModal';
import { ProfileHeader } from './ProfileHeader';
import { useImageCrop } from '../../../hooks';

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
    const [uploading, setUploading] = useState(false);

    // Hook de ajuste de imagem (mesmo do FazendaPerfilEditor)
    const imageCrop = useImageCrop(2, 176);

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

    const loadProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    email: session.user.email || '',
                    phone: data.phone || '',
                    data_nascimento: data.data_nascimento || '',
                    cnh_numero: data.cnh_numero || '',
                    cnh_vencimento: data.cnh_vencimento || '',
                    funcao: data.funcao || '',
                    avatar_url: data.avatar_url || ''
                });
            }
        } catch (error: any) {
            console.error('Erro ao carregar perfil:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const updates = {
                id: session.user.id,
                full_name: formData.full_name,
                phone: formData.phone,
                data_nascimento: formData.data_nascimento || null,
                cnh_numero: formData.cnh_numero,
                cnh_vencimento: formData.cnh_vencimento || null,
                funcao: formData.funcao,
                avatar_url: formData.avatar_url,
                updated_at: new Date(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;
            
            // Atualiza contexto global se necessário
            if (session?.user) {
                 dispatch({ 
                    type: ACTIONS.UPDATE_USER_PROFILE, 
                    profile: { ...session.user, ...updates } 
                });
            }
            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            imageCrop.handleImageUpload(file);
        }
    };

    const handleApplyImage = async () => {
        const base64 = imageCrop.applyAdjustment(400);
        if (!base64) return;

        try {
            setUploading(true);
            const res = await fetch(base64);
            const blob = await res.blob();
            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });

            const fileExt = 'jpg';
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${session.user.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            setFormData(prev => ({ ...prev, avatar_url: filePath }));
            toast.success("Foto preparada! Salve o perfil para confirmar.");
        } catch (error: any) {
            toast.error('Erro no upload: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleAdjustExisting = async () => {
        if (imageCrop.config.rawImage) {
            imageCrop.setIsAdjusting(true);
            return;
        }

        if (!previewUrl) return;

        try {
            const toastId = toast.loading("Carregando imagem...");
            const response = await fetch(previewUrl);
            const blob = await response.blob();
            const file = new File([blob], "avatar.jpg", { type: blob.type });
            
            // O handleImageUpload já abre o modal (setIsAdjusting(true))
            imageCrop.handleImageUpload(file);
            toast.dismiss(toastId);
        } catch (error) {
            console.error(error);
            toast.error("Não foi possível carregar a imagem.");
        }
    };

    return (
        <form onSubmit={handleUpdateProfile} className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-24">
            
            <ImageAdjustModal 
                isOpen={imageCrop.isAdjusting}
                onClose={() => imageCrop.setIsAdjusting(false)}
                adjustConfig={imageCrop.config}
                setZoom={imageCrop.setZoom}
                setOffset={imageCrop.setOffset}
                onApply={handleApplyImage}
                onStartDrag={imageCrop.onStartDrag}
                onMoveDrag={imageCrop.onMoveDrag}
                onEndDrag={imageCrop.onEndDrag}
                canvasRef={imageCrop.canvasRef}
            />

            <ProfileHeader 
                previewUrl={previewUrl}
                fullName={formData.full_name}
                funcao={formData.funcao}
                avatarUrl={formData.avatar_url}
                loading={uploading}
                onFileSelect={handleImageSelect}
                onAdjustClick={handleAdjustExisting}
            />

            {/* Informações Pessoais */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-800 text-base tracking-tight border-b border-gray-50 pb-3 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600"/> Informações Pessoais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField 
                        label="Nome Completo" 
                        icon={User} 
                        value={formData.full_name} 
                        onChange={(e: any) => setFormData({ ...formData, full_name: e.target.value })} 
                        placeholder="Seu nome completo"
                    />
                    <InputField 
                        label="Cargo / Função" 
                        icon={Shield} 
                        value={formData.funcao} 
                        onChange={(e: any) => setFormData({ ...formData, funcao: e.target.value })} 
                        placeholder="Ex: Gerente, Operador"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField 
                        label="Email" 
                        icon={Mail} 
                        value={formData.email} 
                        onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} 
                        placeholder="seu@email.com" 
                        readOnly
                    />
                    <InputField 
                        label="Telefone / WhatsApp" 
                        icon={Phone} 
                        value={formData.phone} 
                        onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })} 
                        placeholder="(00) 00000-0000"
                    />
                </div>

                <InputField 
                    label="Data de Nascimento" 
                    icon={Calendar} 
                    type="date"
                    value={formData.data_nascimento} 
                    onChange={(e: any) => setFormData({ ...formData, data_nascimento: e.target.value })} 
                />
            </div>

            {/* Documentação CNH */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-800 text-base tracking-tight border-b border-gray-50 pb-3 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600"/> Carteira de Habilitação (CNH)
                </h3>

                <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                        Manter sua CNH atualizada é fundamental para operar máquinas e veículos da fazenda. 
                        O sistema irá alertar sobre vencimentos próximos.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField 
                        label="Número de Registro" 
                        icon={CreditCard} 
                        value={formData.cnh_numero} 
                        onChange={(e: any) => setFormData({ ...formData, cnh_numero: e.target.value })} 
                        placeholder="Número da CNH"
                    />
                    <InputField 
                        label="Validade" 
                        icon={Calendar} 
                        type="date"
                        value={formData.cnh_vencimento} 
                        onChange={(e: any) => setFormData({ ...formData, cnh_vencimento: e.target.value })} 
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-[2rem] shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-sm uppercase tracking-wide"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvar Alterações
            </button>
        </form>
    );
}
