import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../utils';
import { RecomendacaoHeader, RecomendacaoItem, RecomendacaoRecord } from '../types';

export function useRecomendacaoForm() {
    const { dados, dispatch, ativos } = useAppContext();
    
    // Estado do Cabeçalho
    const [header, setHeader] = useState<RecomendacaoHeader>({ 
        data: U.todayIso(), 
        safra: '', 
        operacao: '', 
        talhao: '', 
        area: '', 
        cultura: '' 
    });
    
    // Estado do Item Atual (Sendo adicionado)
    const [item, setItem] = useState<Omit<RecomendacaoItem, 'id'>>({ 
        classe: '', 
        produto: '', 
        dose: '' 
    });
    
    // Lista de Itens Adicionados (O "Carrinho")
    const [itensAdicionados, setItensAdicionados] = useState<RecomendacaoItem[]>([]);

    // 1. AUTO-PREENCHIMENTO DE CABEÇALHO
    useEffect(() => {
        const historico = dados.recomendacoes || [];
        if (historico.length > 0) {
            const ultimo = historico[historico.length - 1]; 
            setHeader(prev => ({
                ...prev,
                safra: ultimo.safra || '',
                operacao: ultimo.operacao || '',
                talhao: ultimo.talhao || '',
                cultura: ultimo.cultura || '',
                area: '', 
            }));
            if (ultimo.talhao) {
                 const tObj = ativos.talhoes.find((t:any) => t.nome === ultimo.talhao || t === ultimo.talhao);
                 if(tObj && tObj.area) setHeader(prev => ({ ...prev, area: tObj.area }));
            }
        }
    }, [dados.recomendacoes, ativos.talhoes]);

    // Handler de Talhão
    const handleTalhaoChange = (tNome: string) => {
        const tObj = ativos.talhoes.find((t:any) => (t.nome === tNome) || (t === tNome));
        const area = (tObj && typeof tObj === 'object') ? tObj.area : '';
        setHeader(prev => ({ ...prev, talhao: tNome, area }));
    };

    // Handler de Operação
    const handleOperacaoChange = (opNome: string) => {
        setHeader(prev => ({ ...prev, operacao: opNome }));
        setItem({ classe: '', produto: '', dose: '' });
    };

    // Handler para Adicionar Item
    const handleAddItem = () => {
        if (!item.produto || !item.dose) {
            toast.error("Selecione Insumo e Dose");
            return;
        }
        setItensAdicionados(prev => [...prev, { ...item, id: Date.now() }]);
        setItem({ classe: '', produto: '', dose: '' });
        toast.success("Insumo adicionado!");
    };

    const handleRemoveItem = (id: number) => {
        setItensAdicionados(prev => prev.filter(i => i.id !== id));
    };

    // Enviar Recomendação Unificada
    const handleFinish = async () => { 
        if (!header.safra || !header.talhao || itensAdicionados.length === 0) {
            toast.error("Preencha Definição do Local.");
            return;
        }

        const novo: RecomendacaoRecord = { 
            ...header, 
            data_recomendacao: header.data,
            itens: itensAdicionados,
            id: U.id('RC-') 
        }; 
        
        // Detalhes para a OS
        const detalhesOS: any = {
            "Operação": header.operacao,
            "Talhão": header.talhao,
            "Cultura": header.cultura,
            "Área": `${header.area} ha`,
        };
        
        itensAdicionados.forEach((i, idx) => {
            detalhesOS[`Insumo ${idx + 1}`] = `${i.produto} (${i.dose})`;
        });

        // 1. Criar OS
        dispatch({ 
            type: ACTIONS.ADD_RECORD, 
            modulo: 'os', 
            record: {
                id: U.id('OS-RC-'),
                modulo: 'Recomendação',
                descricao: `Aplicação: ${header.talhao} (${itensAdicionados.length} insumos)`,
                detalhes: detalhesOS,
                status: 'Pendente',
                data_abertura: new Date().toISOString()
            }
        }); 
        
        // 2. Criar Registro de Recomendação
        dispatch({ 
            type: ACTIONS.ADD_RECORD, 
            modulo: 'recomendacoes', 
            record: novo
        }); 
        
        setItensAdicionados([]);
        toast.success('Recomendação unificada criada!'); 
        return true;
    };

    // FILTROS EM CASCATA
    const classesFiltradas = useMemo(() => {
        let classes = ativos.classes || [];
        if (header.operacao) {
            const opObj = (ativos.operacoesAgricolas || []).find((o: any) => o.nome === header.operacao || o === header.operacao);
            if (opObj?.id) {
                const idsClassesDessaOperacao = (ativos.produtos || [])
                    .filter((p: any) => p.operacao_id === opObj.id)
                    .map((p: any) => p.classe_id);
                classes = classes.filter((c: any) => idsClassesDessaOperacao.includes(c.id));
            }
        }
        return classes;
    }, [ativos.classes, ativos.produtos, ativos.operacoesAgricolas, header.operacao]);

    const produtosFiltrados = useMemo(() => {
        let filtered = ativos.produtos || [];
        if (header.operacao) {
            const opObj = (ativos.operacoesAgricolas || []).find((o: any) => o.nome === header.operacao || o === header.operacao);
            if (opObj?.id) filtered = filtered.filter((p: any) => p.operacao_id === opObj.id);
        }
        if (item.classe) {
            const classeObj = (ativos.classes || []).find((c: any) => c.nome === item.classe || c === item.classe);
            if (classeObj?.id) filtered = filtered.filter((p: any) => p.classe_id === classeObj.id);
        }
        return filtered;
    }, [ativos.produtos, ativos.operacoesAgricolas, ativos.classes, header.operacao, item.classe]);

    return {
        header,
        setHeader,
        item,
        setItem,
        itensAdicionados,
        handleTalhaoChange,
        handleOperacaoChange,
        handleAddItem,
        handleRemoveItem,
        handleFinish,
        classesFiltradas,
        produtosFiltrados,
        ativos
    };
}
