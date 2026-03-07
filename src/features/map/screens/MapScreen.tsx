import React from 'react';
import { Satellite, Layers, Loader2, Scan, Download } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapLegend } from '../components/SatelliteLegend';
import { SatelliteCalendar } from '../components/SatelliteCalendar';
import { MapHeader } from '../components/MapHeader';
import { TelemetryCard } from '../components/TelemetryCard';
import { AnalysisControlBar } from '../components/AnalysisControlBar';
import { MapInfoCards } from '../components/MapInfoCards';
import { DrawingToolbar } from '../components/DrawingToolbar';
import { MapEditCards } from '../components/MapEditCards';
import { MapControls } from '../components/MapControls';
import { AgronomicIntelligenceCard } from '../../../components/agronomic/AgronomicIntelligenceCard';
import useMapScreen from '../hooks/useMapScreen';

// ==========================================
// TELA PRINCIPAL: MAPA
// (Lógica de negócio em useMapScreen.ts)
// ==========================================
export default function MapScreen() {
  const {
    mapRef,
    mapType, setMapType,
    isDrawing,
    drawPoints,
    areaHectares,
    hasChanges,
    saving,
    geojsonData,
    activeTab, setActiveTab,
    showCalendar, setShowCalendar,
    calendarMonth, setCalendarMonth,
    satellite,
    agronomic,
    rolePermissions,
    setTela,
    fazendaSelecionada,
    startDrawing,
    startEditing,
    finishDrawing,
    cancelDrawing,
    handleSave,
    handleLocateMe,
    onExportPNG,
    handleFocusArea,
    handleUndo
  } = useMapScreen();

  return (
    <div className="space-y-4 p-4 pb-24 font-inter min-h-screen relative">
    <MapHeader 
      hasChanges={hasChanges} 
      saving={saving} 
      onSave={handleSave} 
      onBack={() => setTela('principal')} 
      fazendaNome={fazendaSelecionada?.nome}
      recCode={fazendaSelecionada?.config?.regional?.rec}
    />
      
      {showCalendar && (
        <SatelliteCalendar
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          availableImages={satellite.availableImages}
          selectedImageIndex={satellite.selectedImageIndex}
          setSelectedImageIndex={satellite.setSelectedImageIndex}
          setShowCalendar={setShowCalendar}
        />
      )}

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab('map')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'map' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Layers className="w-4 h-4" /> Mapa e Edição
        </button>
        <button onClick={() => setActiveTab('analysis')} disabled={!geojsonData} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'analysis' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 disabled:opacity-50'}`}>
          <Satellite className="w-4 h-4" /> Análise de Satélite
        </button>
      </div>

            {activeTab === 'analysis' && (
        <div className="space-y-3 animate-in slide-in-from-top-2">
            <MapInfoCards
                areaHectares={areaHectares}
                availableImages={satellite.availableImages}
                selectedImageIndex={satellite.selectedImageIndex}
                loadingImages={satellite.loadingImages}
                dateError={satellite.dateError}
                onOpenCalendar={() => setShowCalendar(true)}
                onLoadDates={satellite.loadDates}
            />
        </div>
      )}
 
       {activeTab === 'map' && (
          <MapEditCards
            areaHectares={areaHectares}
            isDrawing={isDrawing}
            geojsonData={geojsonData}
            canEdit={rolePermissions?.actions?.mapa_edicao !== false}
            onStartDrawing={startDrawing}
            onStartEditing={startEditing}
          />
        )}

      <div className="w-full flex flex-col">
        <div className="bg-white rounded-t-xl border-t border-x border-gray-200 px-3 sm:px-6 py-4 flex items-center justify-between z-10 relative">
            <div className="flex items-center gap-3 w-full justify-between">
                {activeTab === 'map' ? (
                    <MapControls 
                      mapType={mapType} 
                      setMapType={setMapType} 
                      onLocateMe={handleLocateMe} 
                    />
                ) : (
                    <AnalysisControlBar 
                        overlayType={satellite.overlayType} 
                        setOverlayType={satellite.setOverlayType} 
                    />
                )}
            </div>
        </div>

        <div className="relative isolate z-0 overflow-hidden bg-gray-100 border border-gray-200 shadow-sm h-[500px] rounded-xl">
            <div ref={mapRef} className="absolute inset-0 z-0" style={{ cursor: isDrawing ? 'crosshair' : 'default' }} />
            
            {/* Focus Area Button */}
            {geojsonData && (
                <div className="absolute bottom-20 right-2.5 flex flex-col gap-2 z-[900]">
                    {activeTab === 'analysis' && satellite.currentOverlayUrl && (
                        <button 
                          onClick={onExportPNG}
                          disabled={satellite.loadingImages}
                          className="bg-green-600 p-2 rounded-md shadow-md hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                          title="Exportar PNG (Área Demarcada)"
                        >
                          {satellite.loadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                    )}
                    <button 
                      onClick={handleFocusArea}
                      className="bg-white p-2 rounded-md shadow-md hover:bg-gray-50 border border-gray-300 text-gray-700 transition-colors"
                      title="Centralizar Área Demarcada"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                </div>
            )}

            {isDrawing && (
                <DrawingToolbar
                  drawPoints={drawPoints}
                  onFinish={finishDrawing}
                  onUndo={handleUndo}
                  onCancel={cancelDrawing}
                />
            )}
            {activeTab === 'analysis' && satellite.showOverlay && <MapLegend type={satellite.overlayType} />}
            {satellite.loadingImages && <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-[1000] border border-gray-100"><Loader2 className="w-4 h-4 animate-spin text-green-600" /><span className="text-xs font-bold text-gray-600">Processando...</span></div>}
        </div>

      </div>

      {/* TELEMETRY CARD */}
      <TelemetryCard activeTab={activeTab} />

      {/* AGRONOMIC INTELLIGENCE CARD */}
      {activeTab === 'analysis' && (
        <AgronomicIntelligenceCard 
          agronomic={agronomic} 
          loading={false} 
        />
      )}

       <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-container { background: #f3f4f6 !important; }
        .leaflet-top.leaflet-left { display: none !important; }
      `}</style>
    </div>
  );
}
