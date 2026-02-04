import { U } from '../utils';

// ==========================================
// SERVIÇO DE SINCRONIZAÇÃO (OFFLINE QUEUE)
// ==========================================

const QUEUE_KEY = 'sync_queue';

export const syncService = {
    // Carregar fila do Storage
    loadQueue: () => {
        try {
            const saved = localStorage.getItem(QUEUE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Erro ao carregar fila de sync:", e);
            return [];
        }
    },

    // Salvar fila no Storage
    saveQueue: (queue: any[]) => {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        } catch (e) {
            console.error("Erro ao salvar fila de sync:", e);
        }
    },

    // Adicionar item à fila
    addToQueue: (queue: any[], item: any) => {
        const newQueue = [...queue, { ...item, timestamp: Date.now(), retryCount: 0 }];
        syncService.saveQueue(newQueue);
        return newQueue;
    },

    // Remover item da fila
    removeFromQueue: (queue: any[], id: string) => {
        const newQueue = queue.filter(i => i.id !== id);
        syncService.saveQueue(newQueue);
        return newQueue;
    }
};
