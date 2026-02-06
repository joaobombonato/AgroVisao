import React, { useState, Suspense } from 'react';
import { Map, MapPin, Loader2, Search, ThermometerSnowflake, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useGeocoding } from '../../../hooks';
import { useZarcData } from '../hooks/useZarcData';
import { toast } from 'react-hot-toast';

// Carregamento dinâmico do Mapa
const FarmMap = React.lazy(() => import('../../map/components/FarmMap'));

interface FazendaLocationInputProps {
    formData: any;
    setFormData: (data: any) => void;
    estados: any[];
    municipios: any[];
    loadingLoc: boolean;
    handleSelectMunicipio: (id: string) => void;
    handleLocationChange: (lat: number, lng: number) => void;
    autofillLocation: (lat: number, lng: number, stateSigla: string, cityName: string) => Promise<void>;
}

export default function FazendaLocationInput({
    formData,
    setFormData,
    estados,
    municipios,
    loadingLoc,
    handleSelectMunicipio,
    handleLocationChange,
    autofillLocation
}: FazendaLocationInputProps) {
    const [showMap, setShowMap] = useState(false);
    
    // Hooks de geocoding e ZARC
    const { geocodeAddress, reverseGeocode, getCurrentLocation, loading: geocoding } = useGeocoding();
    const { zarcData, loading: zarcLoading } = useZarcData(formData.cidade);

    // Handle geocoding (Busca Manual)
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

    // Handle GPS location with Reverse Geocoding and AutoFill
    const handleCurrentLocation = async () => {
        const result = await getCurrentLocation();
        if (result) {
            handleLocationChange(result.lat, result.lng); // Update map immediately
            setShowMap(true);
            
            // Tenta preencher cidade e estado via Reverse Geocoding
            const address = await reverseGeocode(result.lat, result.lng);
            if (address) {
                console.log("Endereço reverso:", address);
                
                // 1. Tentar identificar Estado
                const estadoEncontrado = estados.find((e: any) => address.includes(e.nome) || address.includes(e.sigla));
                
                // 2. Tentar identificar Cidade e preencher via Hook Central
                if (estadoEncontrado) {
                     // Tenta extrair o nome da cidade da string de endereço (heuristic)
                     // O nominatim retorna "Cidade, Estado, País" ou "Rua, Bairro, Cidade, Estado..."
                     // A string `address` gerada pelo hook já é simplificada se possível em `currentLocation`.
                     // Mas o hook reverseGeocode retorna `cityName, state` se conseguir.
                     // Vamos assumir que conseguimos extrair ou tentar achar.
                     
                     // O hook reverseGeocode retorna "Cidade, Estado" ou displayName completo.
                     // Vamos tentar separar por virgula.
                     const parts = address.split(',');
                     const potentialCity = parts[0].trim(); // Cidade costuma ser o primeiro se filtrado, ou tentar achar match.

                     // Chama o autofill centralizado
                     await autofillLocation(result.lat, result.lng, estadoEncontrado.sigla, potentialCity);
                     return;
                }
                toast.success('Localização GPS obtida! (Estado não identificado automaticamente)');
            } else {
                toast.success('Localização GPS obtida!');
            }

        } else {
            toast.error('Não foi possível obter sua localização');
        }
    };

    return (
        <div className="space-y-4">
            {/* Estado e Cidade */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                    <select
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white appearance-none"
                        value={formData.estado}
                        onChange={e => setFormData({ ...formData, estado: e.target.value, cidade: '' })}
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
                        value={municipios.find((m: any) => m.nome === formData.cidade)?.id || ''}
                        onChange={e => handleSelectMunicipio(e.target.value)}
                    >
                        <option value="">{loadingLoc ? 'Carregando...' : 'Selecione...'}</option>
                        {municipios.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Região Detectada & ZARC Info */}
            {formData.microregiao && (
                <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Search className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-1">
                                Região Detectada
                                {formData.rec_code && <span className="ml-1 bg-blue-600 text-white px-1.5 py-0.5 rounded text-[8px]">EMBRAPA/ZARC FALLBACK</span>}
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

                    {/* Dados Oficiais ZARC (API MAPA/CKAN) */}
                    {zarcLoading && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Consultando Dados Oficiais ZARC...</span>
                        </div>
                    )}

                    {!zarcLoading && zarcData.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-xl border border-green-100 animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldAlert className="w-4 h-4 text-green-600" />
                                <p className="text-[10px] font-black text-green-800 uppercase tracking-widest">Informação Oficial MAPA (ZARC Soja)</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {zarcData.slice(0, 2).map((item: any, idx: number) => (
                                    <div key={idx} className="bg-white/80 p-2 rounded-lg shadow-sm flex flex-col">
                                        <p className="text-[9px] text-gray-500 font-bold uppercase truncate">Grupo {item.grupo} | {item.solo}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs font-black text-green-700">{item.risco}% Risco</span>
                                            {Number(item.risco) <= 20 ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <ThermometerSnowflake className="w-3 h-3 text-yellow-500" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-2 text-[9px] text-green-600/70 italic">* Fonte: Portal de Dados Abertos do Governo Federal</p>
                        </div>
                    )}
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
        </div>
    );
}
