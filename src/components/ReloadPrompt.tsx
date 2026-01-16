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
        toast((t) => (
            <div className="flex flex-col gap-2">
                <span className="font-bold">Nova versão disponível!</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { updateServiceWorker(true); toast.dismiss(t.id); }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                    >
                        Atualizar
                    </button>
                    <button 
                        onClick={() => { close(); toast.dismiss(t.id); }}
                        className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        ), { duration: Infinity, position: 'bottom-right' });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}
