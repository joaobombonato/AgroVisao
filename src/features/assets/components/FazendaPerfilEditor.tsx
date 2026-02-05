import React, { useState, useEffect } from 'react';
import { Save, Building2, MapPin, User, Ruler, Loader2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { dbService } from '../../../services';
import { useGeocoding, useImageCrop } from '../../../hooks';
import { LogoAdjustModal } from './LogoAdjustModal';
import { FazendaLogoHeader } from './FazendaLogoHeader';

// Mapeamento REC por mesorregião
const getREC = (municipio: any) => {
  const uf = municipio['microrregiao']?.['mesorregiao']?.['UF']?.sigla;
  const mesoId = String(municipio['microrregiao']?.['mesorregiao']?.id);
  if (uf === 'MG') {
    if (mesoId === '3101') return 'M3 - 304';
    if (mesoId === '3105') return 'M3 - 301';
    if (mesoId === '3102') return 'M3 - 303';
  }
  if (uf === 'GO') {
    if (['5204', '5205'].includes(mesoId)) return 'M3 - 301';
    if (['5201', '5202', '5203'].includes(mesoId)) return 'M3 - 302';
  }
  if (uf === 'MT') {
    if (mesoId === '5101' || mesoId === '5102') return 'M4 - 401';
    if (mesoId === '5105') return 'M3 - 304';
    if (mesoId === '5104') return 'M4 - 402';
  }
  if (uf === 'MS') {
    if (mesoId === '5001') return 'M3 - 302';
    if (['5004', '5003'].includes(mesoId)) return 'M2 - 204';
  }
  if (uf === 'PR') {
    if (['4101', '4102', '4106'].includes(mesoId)) return 'M2 - 201';
    if (['4103', '4105'].includes(mesoId)) return 'M2 - 202';
  }
  if (['BA', 'PI', 'MA', 'TO'].includes(uf)) return 'M5 - 501';
  if (uf === 'RS') {
    if (['4301', '4302'].includes(mesoId)) return 'M1 - 102';
    if (mesoId === '4305') return 'M1 - 101';
  }
  return '';
};

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
        onAdjustClick={() => setIsAdjusting(true)}
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
              className="w-full px-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold text-gray-700"
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
              className="w-full px-4 py-3 border-0 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-semibold text-gray-700 disabled:opacity-50"
              value={municipios.find(m => m.nome === formData.cidade)?.id || ''}
              onChange={e => handleSelectMunicipio(e.target.value)}
              disabled={!formData.estado || loadingLoc}
            >
              <option value="">{loadingLoc ? 'Carregando...' : 'Selecione a cidade'}</option>
              {municipios.map(mun => (
                <option key={mun.id} value={mun.id}>{mun.nome}</option>
              ))}
            </select>
            <button
              onClick={handleGeocode}
              disabled={geocoding || !formData.cidade}
              className="p-3 bg-green-100 text-green-700 rounded-2xl hover:bg-green-200 transition-colors disabled:opacity-50"
              title="Buscar coordenadas da cidade"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {formData.rec_code && (
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl shadow-sm">
              <Search className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-[10px]">
              <p className="font-bold text-blue-900 uppercase">Região Agronômica Detectada</p>
              <p className="text-blue-700 font-bold">{formData.rec_code} ({formData.microregiao})</p>
            </div>
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
              <button
                onClick={handleCurrentLocation}
                className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
                title="Capturar GPS Atual"
              >
                <MapPin className="w-4 h-4" />
              </button>
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
