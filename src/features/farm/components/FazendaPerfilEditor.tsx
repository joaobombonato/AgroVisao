import React, { useState, useEffect } from 'react';
import { Save, Building2, MapPin, User, Ruler, Loader2, Search, ShieldAlert, CheckCircle2, ThermometerSnowflake } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { dbService } from '../../../services';
import { useGeocoding, useImageCrop } from '../../../hooks';
import { useZarcData } from '../hooks/useZarcData';
import { getREC } from '../utils/zarcUtils';
import { LogoAdjustModal } from './LogoAdjustModal';
import { FazendaLogoHeader } from './FazendaLogoHeader';


export default function FazendaPerfilEditor() {
  const { fazendaId, fazendaSelecionada, dispatch, fazendasDisponiveis, setFazendaSelecionada } = useAppContext();
  const [loading, setLoading] = useState(false);

  const { geocodeAddress, getCurrentLocation, loading: geocoding } = useGeocoding();
  const {
    config: adjustConfig,
    isAdjusting,
    canvasRef,
    handleImageUpload: cropHandleUpload,
    setZoom,
    setOffset,
    setIsAdjusting,
    applyAdjustment,
    onStartDrag,
    onMoveDrag,
    onEndDrag
  } = useImageCrop(2, 176);

  const [formData, setFormData] = useState({
    nome: '',
    tamanho_ha: '',
    cidade: '',
    estado: '',
    proprietario: '',
    latitude: null as number | null,
    longitude: null as number | null,
    microregiao: '',
    mesoregiao: '',
    regiao_imediata: '',
    rec_code: '',
    logo_url: ''
  });

  const [estados, setEstados] = useState<any[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  // Hook ZARC para dados oficiais
  const { zarcData, loading: zarcLoading } = useZarcData(formData.cidade);

  useEffect(() => {
    if (fazendaSelecionada) {
      setFormData({
        nome: fazendaSelecionada.nome || '',
        tamanho_ha: fazendaSelecionada.tamanho_ha || '',
        cidade: fazendaSelecionada.cidade || '',
        estado: fazendaSelecionada.estado || '',
        proprietario: fazendaSelecionada.proprietario || '',
        latitude: fazendaSelecionada.latitude || null,
        longitude: fazendaSelecionada.longitude || null,
        microregiao: fazendaSelecionada.config?.regional?.microregiao || '',
        mesoregiao: fazendaSelecionada.config?.regional?.mesoregiao || '',
        regiao_imediata: fazendaSelecionada.config?.regional?.regiao_imediata || '',
        rec_code: fazendaSelecionada.config?.regional?.rec || '',
        logo_url: fazendaSelecionada.config?.logo_base64 || ''
      });
    }
  }, [fazendaSelecionada]);

  // Efeito para buscar dados regionais do IBGE se não estiverem no formData
  // Isso garante que o card ZARC apareça mesmo em fazendas antigas
  useEffect(() => {
    if (formData.estado && municipios.length > 0 && formData.cidade && !formData.rec_code) {
      const mun = municipios.find(m => m.nome === formData.cidade);
      if (mun) {
        const rec = getREC(mun);
        if (rec) {
          setFormData(prev => ({
            ...prev,
            microregiao: mun['microrregiao']?.nome || prev.microregiao,
            mesoregiao: mun['microrregiao']?.['mesorregiao']?.nome || prev.mesoregiao,
            regiao_imediata: mun['regiao-imediata']?.nome || prev.regiao_imediata,
            rec_code: rec
          }));
        }
      }
    }
  }, [formData.estado, municipios, formData.cidade, formData.rec_code]);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then(data => setEstados(data))
      .catch(err => console.error("Erro IBGE Estados:", err));
  }, []);

  useEffect(() => {
    if (!formData.estado) {
      setMunicipios([]);
      return;
    }
    setLoadingLoc(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.estado}/municipios`)
      .then(res => res.json())
      .then(data => setMunicipios(data))
      .catch(err => console.error("Erro IBGE Municipios:", err))
      .finally(() => setLoadingLoc(false));
  }, [formData.estado]);

  const handleSelectMunicipio = (mId: string) => {
    const mun = municipios.find(m => String(m.id) === mId);
    if (mun) {
      const rec = getREC(mun);
      setFormData(prev => ({
        ...prev,
        cidade: mun.nome,
        microregiao: mun['microrregiao']?.nome || '',
        mesoregiao: mun['microrregiao']?.['mesorregiao']?.nome || '',
        regiao_imediata: mun['regiao-imediata']?.nome || '',
        rec_code: rec
      }));
    }
  };

  const handleCurrentLocation = async () => {
    const result = await getCurrentLocation();
    if (result) {
      setFormData(prev => ({ ...prev, latitude: result.lat, longitude: result.lng }));
      toast.success("GPS sincronizado!");
    }
  };

  const handleGeocode = async () => {
    if (!formData.cidade || !formData.estado) {
      toast.error("Selecione Estado e Cidade primeiro.");
      return;
    }
    const result = await geocodeAddress(`${formData.cidade}, ${formData.estado}, Brasil`);
    if (result) {
      setFormData(prev => ({ ...prev, latitude: result.lat, longitude: result.lng }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) cropHandleUpload(file);
  };

  const handleApplyAdjustment = () => {
    const result = applyAdjustment(400);
    if (result) setFormData(prev => ({ ...prev, logo_url: result }));
  };

  const handleSave = async () => {
    if (!fazendaId) return;
    setLoading(true);

    try {
      const updates = {
        nome: formData.nome,
        tamanho_ha: Number(formData.tamanho_ha) || 0,
        cidade: formData.cidade,
        estado: formData.estado,
        proprietario: formData.proprietario,
        latitude: formData.latitude,
        longitude: formData.longitude,
        config: {
          ...(fazendaSelecionada?.config || {}),
          logo_base64: formData.logo_url,
          logo_url: formData.logo_url,
          regional: {
            microregiao: formData.microregiao,
            mesoregiao: formData.mesoregiao,
            regiao_imediata: formData.regiao_imediata,
            rec: formData.rec_code
          }
        }
      };

      await dbService.update('fazendas', fazendaId, updates, fazendaId);

      const novaFazenda = { ...fazendaSelecionada, ...updates };
      const novasFazendas = (fazendasDisponiveis || []).map((f: any) =>
        f.id === fazendaId ? novaFazenda : f
      );

      setFazendaSelecionada(novaFazenda);
      dispatch({
        type: ACTIONS.SET_FAZENDA,
        fazendaId: novaFazenda.id,
        fazendaNome: novaFazenda.nome,
        fazendas: novasFazendas,
        config: novaFazenda.config
      });

      toast.success("Perfil da fazenda atualizado!");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustExisting = async () => {
    if (adjustConfig.rawImage) {
      setIsAdjusting(true);
      return;
    }

    if (!formData.logo_url) return;

    try {
      const toastId = toast.loading("Carregando logo...");
      const response = await fetch(formData.logo_url);
      const blob = await response.blob();
      const file = new File([blob], "logo.png", { type: blob.type });
      
      cropHandleUpload(file);
      toast.dismiss(toastId);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar logo.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <LogoAdjustModal 
        isOpen={isAdjusting}
        onClose={() => setIsAdjusting(false)}
        adjustConfig={adjustConfig}
        setZoom={setZoom}
        setOffset={setOffset}
        onApply={handleApplyAdjustment}
        onStartDrag={onStartDrag}
        onMoveDrag={onMoveDrag}
        onEndDrag={onEndDrag}
        canvasRef={canvasRef}
      />

      <FazendaLogoHeader 
        logoUrl={formData.logo_url}
        onFileChange={handleImageUpload}
        onAdjustClick={handleAdjustExisting}
      />

      {/* Formulário de Dados */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-bold text-gray-800 text-base tracking-tight border-b border-gray-50 pb-3 mb-4">Dados da Propriedade</h3>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nome Oficial</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm font-semibold text-gray-700"
              placeholder="Nome da fazenda"
              value={formData.nome || ''}
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Área (ha)</label>
            <div className="relative">
              <Ruler className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="number"
                className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold text-gray-700"
                placeholder="0.00"
                value={formData.tamanho_ha || ''}
                onChange={e => setFormData({ ...formData, tamanho_ha: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Estado (UF)</label>
            <select
              disabled
              className="w-full px-4 py-3 border-0 bg-gray-100 rounded-2xl outline-none text-sm font-semibold text-gray-500 cursor-not-allowed"
              value={formData.estado || ''}
              onChange={e => setFormData({ ...formData, estado: e.target.value, cidade: '' })}
            >
              <option value="">Selecione...</option>
              {estados.map(est => (
                <option key={est.id} value={est.sigla}>{est.nome} ({est.sigla})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cidade</label>
          <div className="flex gap-2">
            <select
              disabled
              className="w-full px-4 py-3 border-0 bg-gray-100 rounded-2xl outline-none text-sm font-semibold text-gray-500 cursor-not-allowed"
              value={municipios.find(m => m.nome === formData.cidade)?.id || ''}
              onChange={e => handleSelectMunicipio(e.target.value)}
            >
              <option value="">{formData.cidade || 'Selecione a cidade'}</option>
            </select>
          </div>
        </div>

        
        {(formData.rec_code || zarcData.length > 0) && (
          <div className="space-y-2 mt-4">
            {formData.rec_code && (
              <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-xl shadow-sm">
                  <Search className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-[10px]">
                  <p className="font-bold text-blue-900 uppercase">Região Detectada</p>
                  <p className="text-blue-700 font-bold">{formData.rec_code} ({formData.mesoregiao || 'Região não mapeada'})</p>
                </div>
                <div className="ml-auto px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-full uppercase tracking-tighter">
                  EMBRAPA/ZARC Fallback
                </div>
              </div>
            )}

            {/* Dados Oficiais MAPA */}
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Latitude</label>
            <input
              type="text"
              readOnly
              className="w-full px-4 py-3 border-0 bg-gray-100 rounded-2xl text-[10px] font-mono text-gray-500"
              value={formData.latitude || 'Não capturada'}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Longitude</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                className="w-full px-4 py-3 border-0 bg-gray-100 rounded-2xl text-[10px] font-mono text-gray-500"
                value={formData.longitude || 'Não capturada'}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Proprietário / Responsável</label>
          <div className="relative">
            <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold text-gray-700"
              placeholder="Nome do responsável"
              value={formData.proprietario || ''}
              onChange={e => setFormData({ ...formData, proprietario: e.target.value })}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-green-600 text-white font-bold py-4 rounded-[2rem] shadow-lg hover:bg-green-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Salvar Configurações
      </button>
    </div>
  );
}
