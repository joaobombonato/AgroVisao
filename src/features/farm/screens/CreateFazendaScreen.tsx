
import React from 'react';
import { ChevronLeft, Loader2, Check } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useFazendaForm } from '../../../hooks';

// Sub-componentes Refatorados
import FazendaLogoUploader from '../components/FazendaLogoUploader';
import FazendaLocationInput from '../components/FazendaLocationInput';
import FazendaFormInputs from '../components/FazendaFormInputs';

export default function CreateFazendaScreen() {
  const { setTela } = useAppContext();

  // Hook para formulário de fazenda (lógica central de estado e submit)
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
    handleSubmit,
    autofillLocation
  } = useFazendaForm();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-4 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="w-full max-w-lg py-6">
        
        {/* Header de Navegação */}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* 1. Upload de Logo (Isolado) */}
          <FazendaLogoUploader 
            logoBase64={formData.logo_base64} 
            onLogoChange={handleLogoChange}
          />

          <div className="space-y-4">
            
            {/* 2. Inputs de Texto (Isolado) */}
            <FazendaFormInputs 
              formData={formData} 
              setFormData={setFormData}
            />

            <FazendaLocationInput 
               formData={formData}
               setFormData={setFormData}
               estados={estados}
               municipios={municipios}
               loadingLoc={loadingLoc}
               handleSelectMunicipio={handleSelectMunicipio}
               handleLocationChange={handleLocationChange}
               autofillLocation={autofillLocation}
            />

          </div>

          {/* Botão de Submit Global */}
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
