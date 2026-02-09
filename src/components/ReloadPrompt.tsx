import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'react-hot-toast';

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
      // Check for updates periodically
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000); // Check every hour
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  React.useEffect(() => {
    if (offlineReady) {
      toast.success('App pronto para uso offline!');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  React.useEffect(() => {
    if (needRefresh) {
        // Auto-update if possible, or show urgent toast
        const update = () => {
          updateServiceWorker(true);
        };

        toast((t) => (
            <div className="flex flex-col gap-2">
                <span className="font-bold">⚠️ Nova versão obrigatória!</span>
                <p className="text-xs">Para corrigir o erro de enquadramento e OCR, precisamos atualizar agora.</p>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { update(); toast.dismiss(t.id); }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold"
                    >
                        Atualizar Agora
                    </button>
                    <button 
                        onClick={() => { close(); toast.dismiss(t.id); }}
                        className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs"
                    >
                        Depois
                    </button>
                </div>
            </div>
        ), { duration: Infinity, position: 'bottom-center' });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}
