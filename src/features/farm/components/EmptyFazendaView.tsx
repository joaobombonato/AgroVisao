import React from 'react';
import { Plus, Building2, Mail, RefreshCw, Clock, ChevronRight } from 'lucide-react';

interface EmptyFazendaViewProps {
    canCreate: boolean;
    loading: boolean;
    userEmail: string;
    onCreateFazenda: () => void;
    onRefresh: () => void;
}

export function EmptyFazendaView({ canCreate, loading, userEmail, onCreateFazenda, onRefresh }: EmptyFazendaViewProps) {
    return (
        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full mt-4">
            
            {/* CAMINHO A: PROPRIETÁRIO - Apenas se puder criar */}
            {canCreate && (
                <div 
                    onClick={onCreateFazenda}
                    className="group bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 hover:shadow-2xl hover:border-green-500/30 transition-all cursor-pointer flex flex-col items-center text-center relative overflow-hidden active:scale-95"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                        <Building2 className="w-32 h-32" />
                    </div>
                    <div className="w-20 h-20 bg-green-50 rounded-[2.2rem] flex items-center justify-center mb-6 shadow-inner border border-green-100/50 group-hover:bg-green-600 group-hover:text-white transition-all duration-500">
                        <Plus className="w-10 h-10 text-green-600 group-hover:text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Sou o Gestor</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                        Quero cadastrar minha fazenda do zero, definir talhões e gerenciar toda a operação.
                    </p>
                    <div className="mt-auto inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-200 group-hover:bg-green-700 group-hover:-translate-y-1 transition-all">
                        Começar Agora <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            )}

            {/* CAMINHO B: CONVIDADO */}
            <div 
                className="group bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 hover:shadow-2xl hover:border-indigo-500/30 transition-all flex flex-col items-center text-center relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] rotate-12">
                    <Mail className="w-32 h-32" />
                </div>
                
                <div className="w-20 h-20 bg-indigo-50 rounded-[2.2rem] flex items-center justify-center mb-6 shadow-inner border border-indigo-100/50 group-hover:bg-indigo-600 transition-all duration-500">
                    <Mail className="w-10 h-10 text-indigo-600 group-hover:text-white" />
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Fui Convidado</h3>
                
                <div className="space-y-4 mb-8">
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        Se você faz parte de uma equipe, sua fazenda aparecerá assim que for autorizada para:
                    </p>
                    <div className="bg-gray-50 px-4 py-3 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-sm font-black text-indigo-600 break-all">{userEmail}</p>
                    </div>
                </div>

                <button 
                    onClick={onRefresh}
                    className="mt-auto w-full bg-white border-2 border-indigo-100 text-indigo-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sincronizar Convites
                </button>
                
                <div className="mt-4 flex items-center gap-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">
                    <Clock className="w-3 h-3" /> Verificando acesso em tempo real
                </div>
            </div>

        </div>
    );
}
