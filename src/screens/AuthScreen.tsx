import React, { useState } from 'react';
import { Mail, Lock, UserPlus, LogIn, Tractor, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';

// Componente simples para a tela de autenticação
export default function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    // Estado para rastrear se um cadastro foi enviado (para mostrar a mensagem dinâmica)
    const [signupSent, setSignupSent] = useState(false); 

    const title = isLogin ? 'Acessar AgroDev' : 'Criar Conta';
    
    // MUDANÇA DE COR E TEXTO DO BOTÃO BASEADO NO ESTADO
    const actionText = isLogin ? 'Entrar' : 'Cadastrar e Confirmar';
    const buttonColor = isLogin ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSignupSent(false); // Reseta ao tentar submeter

        if (!email || !password) {
            toast.error("Preencha e-mail e senha.");
            setLoading(false);
            return;
        }

        let error = null;

        if (isLogin) {
            const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            error = loginError;
        } else {
            const { error: signupError } = await supabase.auth.signUp({ email, password });
            error = signupError;
        }

        setLoading(false);

        if (error) {
            toast.error(`Erro: ${error.message}`);
        } else {
            if (isLogin) {
                toast.success("Login realizado. Entrando no sistema...", { duration: 2000 });
            } else {
                // FEEDBACK VISUAL NO CADASTRO (Notificação de longa duração)
                setSignupSent(true); 
                toast.success(
                    "E-mail de confirmação enviado! Verifique sua caixa de entrada.", 
                    { duration: 6000 }
                );
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-2xl space-y-6">
                
                <div className="flex flex-col items-center">
                    <Tractor className="w-10 h-10 text-green-600 mb-2"/>
                    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestão Rural Inteligente</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400"/>
                        <input
                            type="email"
                            placeholder="E-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 outline-none transition-colors"
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400"/>
                        <input
                            type="password"
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 outline-none transition-colors"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full text-white font-bold py-3 rounded-xl shadow-md ${buttonColor} transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : isLogin ? <LogIn className="w-5 h-5"/> : <UserPlus className="w-5 h-5"/>}
                        {loading ? 'Processando...' : actionText}
                    </button>
                </form>

                <div className="text-center">
                    <button
                        onClick={() => { setIsLogin(!isLogin); setSignupSent(false); }} // Reseta o estado ao trocar
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        {isLogin ? 'Não tem conta? Crie uma agora!' : 'Já tenho conta. Fazer Login'}
                    </button>
                </div>
                
                {/* MENSAGEM DINÂMICA: Só aparece se estiver em Cadastro E já tiver tentado enviar */}
                {!isLogin && signupSent && (
                    <div className="flex items-center gap-2 p-3 text-xs text-orange-700 bg-orange-100 rounded-lg animate-in fade-in duration-300">
                        <AlertTriangle className="w-4 h-4"/>Verifique a caixa de entrada (e spam) para confirmar seu e-mail.
                    </div>
                )}
                {/* MENSAGEM DE AJUDA: Mostra uma dica de cadastro se estiver na tela de cadastro e não tiver submetido */}
                {!isLogin && !signupSent && (
                    <div className="text-center text-xs text-gray-400">
                        A senha deve ter no mínimo 6 caracteres.
                    </div>
                )}

            </div>
        </div>
    );
}