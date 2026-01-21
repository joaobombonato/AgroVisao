import React, { useState, useEffect } from 'react';
import { Camera, Save, Building2, MapPin, User, Ruler, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../../context/AppContext';
import { dbService } from '../../../services';

export default function FazendaPerfilEditor() {
    const { fazendaId, fazendaSelecionada, fazendaNome, dispatch, fazendasDisponiveis, ACTIONS } = useAppContext();
    const [loading, setLoading] = useState(false);
    
    // Estado local do form
    const [formData, setFormData] = useState({
        nome: '',
        tamanho_ha: '',
        cidade: '',
        estado: '',
        proprietario: '',
        logo_url: '' // Vamos usar Base64 aqui por enquanto
    });

    // Carregar dados ao montar
    useEffect(() => {
        if (fazendaSelecionada) {
            setFormData({
                nome: fazendaSelecionada.nome || '',
                tamanho_ha: fazendaSelecionada.tamanho_ha || '',
                cidade: fazendaSelecionada.cidade || '',
                estado: fazendaSelecionada.estado || '',
                proprietario: fazendaSelecionada.proprietario || '',
                logo_url: fazendaSelecionada.logo_url || fazendaSelecionada.config?.logo_base64 || ''
            });
        }
    }, [fazendaSelecionada]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limite de 200KB para Base64 (evitar travar o banco)
        if (file.size > 200 * 1024) {
            toast.error("A imagem deve ter no máximo 200KB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setFormData(prev => ({ ...prev, logo_url: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!fazendaId) return;
        setLoading(true);

        try {
            // Preparar payload
            const updates = {
                nome: formData.nome,
                tamanho_ha: Number(formData.tamanho_ha) || 0,
                cidade: formData.cidade,
                estado: formData.estado,
                proprietario: formData.proprietario,
                // Salvar logo dentro do config JSONB para não precisar de coluna nova agora,
                // ou se o usuário já criou a coluna, podemos tentar salvar direto?
                // Vamos salvar no config por garantia, mas se tiver coluna logo_url seria melhor.
                // Vou salvar no config.logo_base64 por segurança.
                config: {
                    ...(fazendaSelecionada?.config || {}),
                    logo_base64: formData.logo_url
                }
            };

            // Atualizar no Supabase
            // Nota: dbService.update é genérico.
            // Precisamos garantir que estamos atualizando a tabela 'fazendas'
            const { error } = await dbService.update('fazendas', fazendaId, updates, fazendaId);
            
            if (error) throw error;

            // Atualizar Contexto Global
            const novaFazenda = { ...fazendaSelecionada, ...updates };
            
            // Atualizar lista de fazendas disponíveis no contexto
            const novasFazendas = fazendasDisponiveis.map((f: any) => 
                f.id === fazendaId ? novaFazenda : f
            );

            // Disparar atualização global
            // Precisamos de uma ACTION para atualizar a fazenda atual e a lista
            dispatch({ type: ACTIONS.SET_FAZENDA, payload: novaFazenda });
            // Se houver action para atualizar lista, usar aqui. Senão, recarregar página é fallback.
           
            toast.success("Perfil da fazenda atualizado!");

        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Seção de Logo */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="relative group cursor-pointer">
                    <div className="w-32 h-32 rounded-full border-4 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner">
                        {formData.logo_url ? (
                            <img src={formData.logo_url} alt="Logo Fazenda" className="w-full h-full object-cover" />
                        ) : (
                            <Building2 className="w-12 h-12 text-gray-300" />
                        )}
                    </div>
                    
                    <label className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full shadow-lg hover:bg-green-700 transition-colors cursor-pointer">
                        <Camera className="w-5 h-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>
                <p className="mt-4 text-sm text-gray-500 font-medium">Toque para alterar a logo da propriedade</p>
                <p className="text-xs text-gray-400">Máx. 200KB (JPG/PNG)</p>
            </div>

            {/* Formulário de Dados */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-800 text-lg border-b pb-2 mb-4">Dados Cadastrais</h3>
                
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Propriedade</label>
                     <div className="relative">
                        <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            value={formData.nome}
                            onChange={e => setFormData({...formData, nome: e.target.value})}
                        />
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Área (ha)</label>
                         <div className="relative">
                            <Ruler className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input 
                                type="number" 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                value={formData.tamanho_ha}
                                onChange={e => setFormData({...formData, tamanho_ha: e.target.value})}
                            />
                         </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Cidade / UF</label>
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="Cidade"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                value={formData.cidade}
                                onChange={e => setFormData({...formData, cidade: e.target.value})}
                             />
                             <input 
                                type="text" 
                                placeholder="UF"
                                maxLength={2}
                                className="w-20 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none uppercase text-center"
                                value={formData.estado}
                                onChange={e => setFormData({...formData, estado: e.target.value.toUpperCase()})}
                             />
                         </div>
                    </div>
                </div>

                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Proprietário / Responsável</label>
                     <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            value={formData.proprietario}
                            onChange={e => setFormData({...formData, proprietario: e.target.value})}
                        />
                     </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                Salvar Alterações
            </button>
        </div>
    );
}
