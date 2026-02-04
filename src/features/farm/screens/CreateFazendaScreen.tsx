
import React, { useState, Suspense, useRef } from 'react';
import { ArrowLeft, MapPin, Loader2, Check, AlertTriangle, Map, ChevronLeft, X, ZoomOut, ZoomIn, ChevronUp, ChevronDown, ChevronRight, Building2, Camera, Ruler, Search } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../utils';
import { Input, Select } from '../../../components/ui/Shared';
import { useFazendaForm, useGeocoding, useImageCrop } from '../../../hooks';
import { toast } from 'react-hot-toast';

// Carregamento dinâmico do Mapa para não travar a UI inicial
const FarmMap = React.lazy(() => import('../../map/components/FarmMap'));

export default function CreateFazendaScreen() {
  const { setTela } = useAppContext();
  const [showMap, setShowMap] = useState(false);

  // Hook para formulário de fazenda (lógica IBGE, submit, etc)
  const {
    formData,
    setFormData,
    loading,
    estados,
    municipios,
    loadingLoc,
    handleSelectMunicipio,
    handleLocationChange,
    handleLogoChange,
    handleSubmit
  } = useFazendaForm();

  // Hook para geocoding
  const { geocodeAddress, getCurrentLocation, loading: geocoding } = useGeocoding();

  // Hook para ajuste de imagem
  const {
    config: adjustConfig,
    isAdjusting,
    canvasRef,
    handleImageUpload,
    setZoom,
    setOffset,
    setIsAdjusting,
    applyAdjustment,
    onStartDrag,
    onMoveDrag,
    onEndDrag
  } = useImageCrop(2); // maxSizeMB = 2

  // Referência para input de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle geocoding
  const handleGeocode = async () => {
    if (!formData.cidade || !formData.estado) {
      toast.error('Preencha cidade e estado primeiro');
      return;
    }

    const estadoNome = estados.find((e: any) => e.sigla === formData.estado)?.nome || formData.estado;
    const result = await geocodeAddress(`${formData.cidade}, ${estadoNome}, Brasil`);

    if (result) {
      handleLocationChange(result.lat, result.lng);
      setShowMap(true);
      toast.success(`Localização encontrada: ${formData.cidade}`);
    } else {
      toast.error('Não foi possível encontrar a localização');
    }
  };

  // Handle GPS location
  const handleCurrentLocation = async () => {
    const result = await getCurrentLocation();
    if (result) {
      handleLocationChange(result.lat, result.lng);
      setShowMap(true);
      toast.success('Localização GPS obtida!');
    } else {
      toast.error('Não foi possível obter sua localização');
    }
  };

  // Handle image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Apply image adjustment
  const handleApplyImage = () => {
    const result = applyAdjustment(400); // outputSize only
    if (result) {
      handleLogoChange(result);
      toast.success('Logo aplicado!');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="w-full max-w-lg py-6">
        
        <button 
          onClick={() => setTela('fazenda_selection')}
          className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium transition-colors"
        >
          <ChevronLeft className="w-5 h-5" /> Voltar
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Nova Propriedade</h1>
          <p className="text-gray-500 text-sm">Cadastre os dados básicos da sua fazenda para começar.</p>
        </div>

        {/* Modal de Ajuste de Imagem */}
        {isAdjusting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in">
            <div className="bg-white rounded-3xl w-[90%] max-w-sm shadow-2xl overflow-hidden m-4">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-800">Ajustar Logo</h2>
                <button onClick={() => setIsAdjusting(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 flex flex-col items-center gap-4">
                <div 
                  className="w-44 h-44 rounded-2xl border-4 border-green-600 overflow-hidden bg-gray-100 relative cursor-move touch-none shadow-inner"
                  onMouseDown={onStartDrag}
                  onMouseMove={onMoveDrag}
                  onMouseUp={onEndDrag}
                  onMouseLeave={onEndDrag}
                  onTouchStart={onStartDrag}
                  onTouchMove={onMoveDrag}
                  onTouchEnd={onEndDrag}
                >
                  {adjustConfig.rawImage && (
                    <img 
                      src={adjustConfig.rawImage} 
                      alt="preview"
                      className="absolute pointer-events-none"
                      style={{
                        transform: `translate(${adjustConfig.offsetX}px, ${adjustConfig.offsetY}px) scale(${adjustConfig.zoom})`,
                        transformOrigin: 'center center',
                        maxWidth: 'none',
                        left: '50%',
                        top: '50%',
                        marginLeft: '-50%',
                        marginTop: '-50%'
                      }}
                      draggable={false}
                    />
                  )}
                </div>
                
                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                      <span className="flex items-center gap-1"><ZoomOut className="w-3 h-3"/> Zoom Out</span>
                      <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{(adjustConfig.zoom * 100).toFixed(0)}%</span>
                      <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3"/> Zoom In</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="4" 
                      step="0.01"
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                      value={adjustConfig.zoom}
                      onChange={e => setZoom(parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      <div />
                      <button type="button" onClick={() => setOffset(adjustConfig.offsetX, adjustConfig.offsetY - 10)} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronUp className="w-4 h-4 text-gray-600"/></button>
                      <div />
                      <button type="button" onClick={() => setOffset(adjustConfig.offsetX - 10, adjustConfig.offsetY)} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronLeft className="w-4 h-4 text-gray-600"/></button>
                      <button type="button" onClick={() => setOffset(0, 0)} className="w-14 h-9 flex items-center justify-center bg-green-600 text-white rounded-lg font-black text-[9px] shadow-md hover:bg-green-700 transition-all active:scale-95">RESET</button>
                      <button type="button" onClick={() => setOffset(adjustConfig.offsetX + 10, adjustConfig.offsetY)} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronRight className="w-4 h-4 text-gray-600"/></button>
                      <div />
                      <button type="button" onClick={() => setOffset(adjustConfig.offsetX, adjustConfig.offsetY + 10)} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronDown className="w-4 h-4 text-gray-600"/></button>
                      <div />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50/80 border-t flex gap-2">
                <button type="button" onClick={() => setIsAdjusting(false)} className="flex-1 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
                <button 
                  type="button" 
                  onClick={handleApplyImage}
                  className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-green-700 active:scale-95 transition-all text-xs"
                >
                  <Check className="w-4 h-4" /> Aplicar
                </button>
              </div>
            </div>
            <canvas ref={canvasRef} width={400} height={400} className="hidden" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Seletor de Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-4 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner">
                {formData.logo_base64 ? (
                  <img src={formData.logo_base64} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-10 h-10 text-gray-300" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full shadow-lg border-2 border-white cursor-pointer hover:bg-green-700 transition-colors">
                <Camera className="w-4 h-4" />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
            {formData.logo_base64 && (
              <button 
                type="button" 
                onClick={() => handleLogoChange('')}
                className="text-xs text-red-500 hover:text-red-700 mt-2 flex items-center gap-1 font-medium"
              >
                <X className="w-3 h-3" /> Remover
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Nome da Fazenda */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 text-green-600" />
                Nome da Propriedade *
              </label>
              <input 
                type="text" 
                required
                placeholder="Ex: Fazenda Boa Vista"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
              />
            </div>

            {/* Tamanho */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Ruler className="w-4 h-4 text-green-600" />
                Tamanho (hectares)
              </label>
              <input 
                type="number" 
                placeholder="Ex: 500"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                value={formData.tamanho_ha}
                onChange={e => setFormData({...formData, tamanho_ha: e.target.value})}
              />
            </div>

            {/* Estado e Cidade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                <select 
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white appearance-none"
                  value={formData.estado}
                  onChange={e => setFormData({...formData, estado: e.target.value, cidade: ''})}
                >
                  <option value="">Selecione...</option>
                  {estados.map((e: any) => (
                    <option key={e.sigla} value={e.sigla}>{e.sigla}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                <select 
                  required
                  disabled={!formData.estado || loadingLoc}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white appearance-none disabled:bg-gray-100"
                  value={municipios.find((m:any) => m.nome === formData.cidade)?.id || ''}
                  onChange={e => handleSelectMunicipio(e.target.value)}
                >
                  <option value="">{loadingLoc ? 'Carregando...' : 'Selecione...'}</option>
                  {municipios.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Região Detectada */}
            {formData.microregiao && (
              <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-1">
                    Região Detectada
                    {formData.rec_code && <span className="ml-1 bg-blue-600 text-white px-1.5 py-0.5 rounded text-[8px]">EMBRAPA/ZARC</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-blue-700 font-bold text-sm">
                      {formData.rec_code ? formData.rec_code : `${formData.mesoregiao || 'Micro'} - ${formData.microregiao}`}
                    </p>
                    {formData.rec_code && (
                      <p className="text-[10px] text-blue-400 font-medium">({formData.microregiao})</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção de Geolocalização */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-800">Localização no Mapa</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCurrentLocation}
                    disabled={geocoding}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 font-bold"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    GPS
                  </button>
                  <button
                    type="button"
                    onClick={handleGeocode}
                    disabled={geocoding}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 font-bold"
                  >
                    {geocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Buscar
                  </button>
                </div>
              </div>

              {formData.latitude && formData.longitude && (
                <div className="text-xs text-gray-500 mb-2">
                  📍 {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                </div>
              )}

              {showMap ? (
                <Suspense fallback={
                  <div className="h-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  </div>
                }>
                  <FarmMap 
                    latitude={formData.latitude || undefined}
                    longitude={formData.longitude || undefined}
                    onLocationChange={handleLocationChange}
                    editable={true}
                    height="250px"
                  />
                </Suspense>
              ) : (
                <div 
                  onClick={() => setShowMap(true)}
                  className="h-[100px] bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300"
                >
                  <span className="text-gray-500 text-sm">Clique para abrir o mapa</span>
                </div>
              )}
            </div>

            {/* Proprietário */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Proprietário</label>
              <input 
                type="text" 
                placeholder="Nome completo"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                value={formData.proprietario}
                onChange={e => setFormData({...formData, proprietario: e.target.value})}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5"/>}
            Criar Propriedade
          </button>

        </form>
      </div>
    </div>
  );
}
