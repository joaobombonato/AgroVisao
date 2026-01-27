import React, { useState } from "react";
import {
  Mail,
  Lock,
  UserPlus,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sprout,
  User,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";
import { U } from "../data/utils";

export default function AuthCadastroScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [funcao, setFuncao] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password || !fullName || !funcao) {
      toast.error("Preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName,
          funcao: funcao
        }
      }
    });

    setLoading(false);

    if (error) {
      toast.error(`Erro ao cadastrar: ${U.translateAuthError(error.message)}`);
    } else {
      setSuccess(true);
      toast.success("Cadastro iniciado!");
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Verifique seu E-mail
        </h2>
        <p className="text-gray-600 mb-8 max-w-sm">
          Enviamos um link de confirmação para <strong>{email}</strong>. <br />
          Por favor, confirme para acessar o AgroVisão.
        </p>

        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex gap-3 text-left mb-8 max-w-sm">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-xs text-orange-800">
            Não recebeu? Verifique a caixa de Spam ou Lixo Eletrônico. O e-mail
            pode levar alguns minutos.
          </p>
        </div>

        <button
          onClick={onBack}
          className="text-indigo-600 font-bold hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <button
        onClick={onBack}
        className="mb-8 text-gray-500 hover:text-gray-800 flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <img src="/logo-full.png" alt="AgroVisão" className="h-12 object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Crie sua conta
        </h1>
        <p className="text-gray-500">
          Comece a transformar sua gestão rural hoje mesmo.
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600 uppercase ml-1">
            Seu E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="nome@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600 uppercase ml-1">
            Nome Completo
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Seu nome oficial"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600 uppercase ml-1">
            Sua Função
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Ex: Proprietário, Gerente, Operador"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600 uppercase ml-1">
            Senha
          </label>
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all"
              required
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

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600 uppercase ml-1">
            Confirmar Senha
          </label>
          <div className="relative group">
            <CheckCircle2 className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )}
          {loading ? "Criando conta..." : "Cadastrar Gratuitamente"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        Ao se cadastrar, você concorda com os Termos de Uso do AgroVisão.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center opacity-60">
         <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Desenvolvido por</span>
         <img src="/marca-praticoapp.png" alt="PraticoAPP" className="h-5 object-contain grayscale hover:grayscale-0 transition-all cursor-pointer" onClick={() => window.open('https://praticoapp.com.br', '_blank')}/>
      </div>
    </div>
  );
}
