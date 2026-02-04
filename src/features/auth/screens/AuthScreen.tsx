
import React, { useState } from 'react';
import { Mail, Lock, LogIn, Loader2, Sprout, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../supabaseClient';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../utils';
import { APP_VERSION } from '../../../constants';
import AuthCadastroScreen from './AuthCadastroScreen';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!email || !password) {
            toast.error("Preencha e-mail e senha.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        
        // Se der erro, mostra toast. Se sucesso, o App.tsx detecta mudança de sessão automaticamente.
        if (error) {
            toast.error(`Erro: ${U.translateAuthError(error.message)}`);
            setLoading(false);
        } else {
            toast.success("Login realizado. Entrando...", { duration: 2000 });
            // Loading fica true até o componente desmontar
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!email) {
            toast.error("Informe seu e-mail.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });

        if (error) {
            toast.error(`Erro: ${U.translateAuthError(error.message)}`);
        } else {
            toast.success("Link de recuperação enviado para seu e-mail!");
            setView('login');
        }
        setLoading(false);
    };

    // Sub-rota para cadastro
    if (view === 'register') {
        return <AuthCadastroScreen onBack={() => setView('login')} />;
    }

    if (view === 'forgot') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8 text-center">
                    <div>
                        <img src="/logo-full.png" alt="AgroVisão" className="h-16 object-contain mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-gray-900">Recuperar Senha</h2>
                        <p className="mt-2 text-sm text-gray-500">Informe seu e-mail para receber o link de recuperação.</p>
                    </div>
                    <form onSubmit={handleResetPassword} className="space-y-6 text-left">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase ml-1">E-mail</label>
                            <input
                                type="email"
                                required
                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Link de Recuperação"}
                        </button>
                    </form>
                    <button onClick={() => setView('login')} className="text-sm font-bold text-green-600 hover:underline">
                        Voltar para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex">
            {/* LADO ESQUERDO - BANNER VISUAL (Escondido em Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden items-center justify-center">
                 {/* Imagem de Fundo com Overlay */}
                 <div 
                    className="absolute inset-0 opacity-40 bg-cover bg-center"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1625246333195-5819acf424d6?q=80&w=2070&auto=format&fit=crop")' }} 
                 />
                 <div className="absolute inset-0 bg-gradient-to-br from-green-900/90 to-gray-900/90" />

                <div className="relative z-10 text-white p-12 max-w-lg">
                    <div className="flex flex-col items-start gap-6 mb-6 animate-fade-in-up">
                        <img src="/logo-full.png" alt="AgroVisão Logo" className="h-24 object-contain brightness-0 invert" /> 
                    </div>
                    
                    <h2 className="text-3xl font-light leading-snug mb-6 text-gray-200">
                        A revolução na gestão da sua<br/> 
                        <span className="font-bold text-white">propriedade rural</span>.
                    </h2>
                    
                    <div className="space-y-4 text-gray-400 text-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            <span>Controle total de maquinário e abastecimentos</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            <span>Gestão financeira e centros de custo</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                            <span>Dashboards inteligentes e suporte offline</span>
                        </div>
                    </div>
                 </div>
            </div>

            {/* LADO DIREITO - LOGIN FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                    
                    {/* Header Mobile Opcional */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <img src="/logo-full.png" alt="AgroVisão" className="h-16 object-contain" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Acesse sua conta para gerenciar sua fazenda.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase ml-1">E-mail Corporativo</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all sm:text-sm"
                                    placeholder="usuario@fazenda.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                             <div className="flex items-center justify-between ml-1">
                                <label className="text-xs font-bold text-gray-600 uppercase">Senha</label>
                                <button type="button" onClick={() => setView('forgot')} className="text-xs font-medium text-green-600 hover:text-green-500">Esqueceu a senha?</button>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all sm:text-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">Entrar na Plataforma <ArrowRight className="w-4 h-4"/></span>
                            )}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Novo no AgroVisão?</span>
                        </div>
                    </div>

                     <div className="mt-6 text-center">
                         <button
                            onClick={() => setView('register')}
                            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50/50 transition-all flex items-center justify-center gap-2"
                        >
                            Criar Nova Conta
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                         <p className="text-xs text-gray-400">© 2026 AgroVisão Systems. {APP_VERSION}</p>
                         
                         <div className="mt-6 flex flex-col items-center justify-center opacity-80">
                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-2">Desenvolvido por</span>
                            <img src="/logo-full-praticoapp.png" alt="PraticoAPP" className="h-8 object-contain transition-all hover:scale-105 cursor-pointer" onClick={() => window.open('https://praticoapp.com.br', '_blank')}/>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
