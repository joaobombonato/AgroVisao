import React from 'react';
import { Info, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface InviteFooterProps {
    fazendaNome: string;
}

export function InviteFooter({ fazendaNome }: InviteFooterProps) {
    const appLink = window.location.origin;

    const handleWhatsAppInvite = () => {
        const msg = `Olá! Convido você para a equipe da *${fazendaNome || 'nossa propriedade'}* no aplicativo *AgroVisão*.\n\nCrie sua conta aqui para eu liberar seu acesso: ${appLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleCopyLink = () => {
        const msg = `Olá! Crie sua conta no aplicativo *AgroVisão* para acessar os dados da *${fazendaNome || 'nossa propriedade'}*.\n\nLink: ${appLink}`;
        navigator.clipboard.writeText(msg);
        toast.success("Link copiado!");
    };

    return (
        <div className="p-5 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex gap-4 items-start">
           <div className="p-2 bg-white rounded-xl shadow-sm">
               <Info className="w-4 h-4 text-indigo-600" />
           </div>
           <div className="space-y-1">
               <p className="text-[11px] text-indigo-900 font-black uppercase tracking-widest">Acesso Negado?</p>
               <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                    Se o e-mail não for encontrado, o colaborador precisa criar a conta no AgroVisão primeiro.
               </p>
               <div className="flex flex-wrap gap-3 mt-2">
                    <button 
                        onClick={handleWhatsAppInvite}
                        className="flex items-center gap-1.5 text-[9px] font-black bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 transition-all shadow-sm uppercase"
                    >
                         <MessageCircle className="w-3 h-3" /> Convidar via WhatsApp
                    </button>
                    <button 
                        onClick={handleCopyLink}
                        className="flex items-center gap-1.5 text-[9px] font-black bg-white text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm uppercase"
                    >
                         <Share2 className="w-3 h-3" /> Copiar Link
                    </button>
               </div>
           </div>
        </div>
    );
}
