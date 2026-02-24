import React from 'react';
import { Boxes, Shield } from 'lucide-react';
import { PageHeader, ConfirmModal } from '../../../components/ui/Shared';
import { useAssetEditor } from '../hooks/useAssetEditor';
import { AssetForm } from './AssetForm';
import { AssetList } from './AssetList';
import TalhaoMapEditor from '../../map/components/TalhaoMapEditor';
import FleetRenewalWizard from '../../insurance/components/FleetRenewalWizard';
import { useAppContext } from '../../../context/AppContext';
import { ASSET_DEFINITIONS } from '../../../config/assetsDefinitions';

interface AssetListEditorProps {
    assetKey: string;
    onBack: () => void;
}

export default function AssetListEditor({ assetKey, onBack }: AssetListEditorProps) {
    const { fazendaSelecionada, dbAssets } = useAppContext();
    
    // Buscar configuração do ASSET_DEFINITIONS
    const config = ASSET_DEFINITIONS[assetKey] || {};
    const title = config.title || 'Itens';
    const color = config.color || 'gray';
    const Icon = config.icon;
    const type = config.type || 'simple';
    const placeholder = config.placeholder;
    const label = config.label || title;
    const table = config.table || assetKey;
    const fields = config.fields || [];
    const orderBy = config.orderBy;
    const showPositioner = config.showPositioner;
    
    const editor = useAssetEditor({
        assetKey,
        table,
        type,
        label,
        fields,
        orderBy,
        showPositioner,
    });

    // Extrair geometria da fazenda para o mapa
    const farmGeoJSON = fazendaSelecionada?.geojson 
        ? (typeof fazendaSelecionada.geojson === 'string' 
            ? JSON.parse(fazendaSelecionada.geojson) 
            : fazendaSelecionada.geojson) 
        : null;
    
    // Coletamos os talhões existentes (sem o que estamos editando) para evitar sobreposições
    const existingTalhoes = (dbAssets.talhoes || [])
        .filter((t: any) => t.geometry && (!editor.editingItem || t.id !== editor.editingItem.id))
        .map((t: any) => ({
            id: t.id,
            nome: t.nome,
            geometry: typeof t.geometry === 'string' ? JSON.parse(t.geometry) : t.geometry
        }));

    // Cor do badge/tabs mapeada
    const tabColorMap: any = {
        green: 'text-green-600 bg-green-100 border-green-200',
        red: 'text-red-600 bg-red-100 border-red-200',
        blue: 'text-blue-600 bg-blue-100 border-blue-200',
        orange: 'text-orange-600 bg-orange-100 border-orange-200',
        cyan: 'text-cyan-600 bg-cyan-100 border-cyan-200',
        yellow: 'text-yellow-600 bg-yellow-100 border-yellow-200',
        purple: 'text-purple-600 bg-purple-100 border-purple-200',
        amber: 'text-amber-600 bg-amber-100 border-amber-200',
        indigo: 'text-indigo-600 bg-indigo-100 border-indigo-200',
    };
    const tabBaseClass = 'px-5 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border';

    // Selecionar máquinas pelos IDs
    const selectedMachines = editor.listToRender.filter((m: any) => editor.selectedIds.includes(m.id));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100/80 p-4 pb-32 font-inter animate-in fade-in duration-300">
            <PageHeader 
                title={title} 
                icon={Icon} 
                colorClass={`bg-${color}-600`}
                setTela={onBack}
                backTarget=""
            />

            {/* Tabs segmentadas */}
            <div className="flex gap-2 mt-4 mb-4">
                <button 
                    className={`${tabBaseClass} ${editor.activeTab === 'cadastro' ? tabColorMap[color] : 'bg-gray-50 text-gray-400 hover:text-gray-600 border-transparent'}`}
                    onClick={() => editor.setActiveTab('cadastro')}
                >
                    Cadastro
                </button>
                <button 
                    className={`${tabBaseClass} ${editor.activeTab === 'lista' ? tabColorMap[color] : 'bg-gray-50 text-gray-400 hover:text-gray-600 border-transparent'}`}
                    onClick={() => editor.setActiveTab('lista')}
                >
                    Registros ({editor.listToRender.length})
                </button>
            </div>

            {/* Formulário */}
            {editor.activeTab === 'cadastro' && (
                <AssetForm
                    assetKey={assetKey}
                    color={color}
                    type={type}
                    label={label}
                    fields={fields}
                    placeholder={placeholder}
                    dbAssets={dbAssets}
                    editingItem={editor.editingItem}
                    newItemName={editor.newItemName}
                    newItemFields={editor.newItemFields}
                    openSections={editor.openSections}
                    formTab={editor.formTab}
                    setNewItemName={editor.setNewItemName}
                    setNewItemFields={editor.setNewItemFields}
                    setFormTab={editor.setFormTab}
                    setShowMap={editor.setShowMap}
                    onSubmit={editor.handleAdd}
                    onCancel={editor.cancelEdit}
                    toggleSection={editor.toggleSection}
                    getSuggestions={editor.getSuggestions as (fieldKey: string) => string[]}
                />
            )}

            {editor.activeTab === 'lista' && (
                <AssetList
                    title={label}
                    assetKey={assetKey}
                    type={type}
                    fields={fields}
                    dbAssets={dbAssets}
                    showPositioner={showPositioner}
                    listToRender={editor.listToRender}
                    selectedIds={editor.selectedIds}
                    isSelectingBulk={editor.isSelectingBulk}
                    setIsSelectingBulk={editor.setIsSelectingBulk}
                    setSelectedIds={editor.setSelectedIds}
                    onToggleSelect={editor.toggleSelect}
                    onToggleSelectAll={editor.toggleSelectAll}
                    onEdit={editor.startEdit}
                    onDelete={editor.handleDelete}
                    onMove={editor.handleMove}
                />
            )}

            {/* FAB - Wizard de Seguro (Máquinas) */}
            {assetKey === 'maquinas' && editor.selectedIds.length > 0 && (
                <button 
                    onClick={() => editor.setIsWizardOpen(true)}
                    className="fixed bottom-24 right-4 z-50 glass-card bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce-slow"
                >
                    <Shield className="w-4 h-4" />
                    Seguro ({editor.selectedIds.length})
                </button>
            )}
            


            {/* Modal de Confirmação de Exclusão */}
            <ConfirmModal
                isOpen={!!editor.itemToDelete}
                onClose={() => editor.setItemToDelete(null)}
                onConfirm={editor.confirmDelete}
                title={`Excluir ${label}?`}
                message={`Essa ação removerá permanentemente "${editor.itemToDelete?.nome || editor.itemToDelete}". Deseja continuar?`}
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
                variant="danger"
            />

            {/* Editor de Talhão no Mapa */}
            {editor.showMap && (
                <TalhaoMapEditor
                    farmGeoJSON={farmGeoJSON}
                    initialGeoJSON={editor.editingItem?.geometry ? 
                        (typeof editor.editingItem.geometry === 'string' 
                            ? JSON.parse(editor.editingItem.geometry) 
                            : editor.editingItem.geometry
                        ) : null
                    }
                    existingTalhoes={existingTalhoes}
                    onSave={(data: { geojson: any; areaHectares: number }) => {
                        editor.setNewItemFields({ 
                            ...editor.newItemFields, 
                            geometry: data.geojson, 
                            area_ha: parseFloat(data.areaHectares.toFixed(2))
                        });
                        editor.setShowMap(false);
                    }}
                    onClose={() => editor.setShowMap(false)}
                />
            )}

            {/* Wizard de Renovação de Seguro */}
            {editor.isWizardOpen && (
                <FleetRenewalWizard
                    selectedMachines={selectedMachines}
                    onClose={() => {
                        editor.setIsWizardOpen(false);
                        editor.toggleSelectAll(); // Limpa seleção
                    }}
                />
            )}
        </div>
    );
}
