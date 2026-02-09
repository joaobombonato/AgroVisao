import React from 'react';
import { User, Calendar, Phone, CreditCard, ChevronRight, Loader2, Settings } from 'lucide-react';
import { Input } from '../../../components/ui/Shared';

interface ProfileOnboardingProps {
    loading: boolean;
    userName: string;
    setUserName: (v: string) => void;
    userPhone: string;
    setUserPhone: (v: string) => void;
    birthDate: string;
    setBirthDate: (v: string) => void;
    cnhNumber: string;
    setCnhNumber: (v: string) => void;
    cnhExpiry: string;
    setCnhExpiry: (v: string) => void;
    onSave: (e: React.FormEvent) => void;
    onLogout: () => void;
}

// Máscaras
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

export function ProfileOnboarding({
    loading,
    userName, setUserName,
    userPhone, setUserPhone,
    birthDate, setBirthDate,
    cnhNumber, setCnhNumber,
    cnhExpiry, setCnhExpiry,
    onSave,
    onLogout
}: ProfileOnboardingProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl border border-gray-100 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-indigo-50 rounded-[2.2rem] flex items-center justify-center mb-8 shadow-inner border border-indigo-100/50">
                    <Settings className="w-10 h-10 text-indigo-600 animate-spin" />
                </div>
                
                <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Bem-vindo!</h2>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-10">
                    Para começarmos, como devemos te chamar e qual seu contato?
                </p>

                <form onSubmit={onSave} className="w-full space-y-5 text-left">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seu Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                            <input 
                                type="text" 
                                required
                                value={userName}
                                onChange={e => setUserName(e.target.value)}
                                placeholder="Ex: João da Silva"
                                className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none placeholder:text-[10px] placeholder:text-gray-400/70"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nascimento</label>
                            <div className="relative">
                                <Input 
                                    type="date" 
                                    value={birthDate}
                                    onChange={(e: any) => {
                                        let val = e.target.value;
                                        if (val.length > 10) val = val.slice(0, 10);
                                        setBirthDate(val);
                                    }}
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none uppercase placeholder:text-[10px] placeholder:text-gray-400/70"
                                />
                                <Calendar className="absolute left-4 top-4 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <input 
                                    type="tel" 
                                    value={userPhone}
                                    onChange={e => setUserPhone(applyPhoneMask(e.target.value))}
                                    placeholder="(00) 00000-0000"
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none placeholder:text-[10px] placeholder:text-gray-400/70"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número CNH</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={cnhNumber}
                                    onChange={e => setCnhNumber(applyCNHMask(e.target.value))}
                                    placeholder="000.000.000-00"
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none placeholder:text-[10px] placeholder:text-gray-400/70"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vencimento CNH</label>
                            <div className="relative">
                                <Input 
                                    type="date" 
                                    value={cnhExpiry}
                                    onChange={(e: any) => {
                                        let val = e.target.value;
                                        if (val.length > 10) val = val.slice(0, 10);
                                        setCnhExpiry(val);
                                    }}
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 text-xs font-normal transition-all outline-none uppercase placeholder:text-[10px] placeholder:text-gray-400/70"
                                />
                                <Calendar className="absolute left-4 top-4 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-[9px] text-indigo-400 font-medium italic ml-1 -mt-2">
                        * O vencimento é para sua comodidade, alertaremos você 30 dias antes.
                    </p>

                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-[0.2em]"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                            Concluir Cadastro
                        </button>
                    </div>
                    
                    <button 
                        type="button"
                        onClick={onLogout}
                        className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                    >
                        Sair da Conta
                    </button>
                </form>
            </div>
        </div>
    );
}
