import React from 'react';
import { Info } from 'lucide-react';
import { WEATHER_SOURCES } from '../../services/multiSourceWeather';

export const WeatherSourcesInfo: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <Info className="w-4 h-4 text-blue-500" />
        Fontes de Dados Meteorológicos
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Fonte</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Origem</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-600">Dias</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {WEATHER_SOURCES.map((source, i) => (
              <tr key={source.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    {source.logo ? (
                      <img src={source.logo} alt={source.name} className="w-6 h-6 object-contain" />
                    ) : (
                      <span className="text-base">{source.icon}</span>
                    )}
                    <a 
                      href={`https://${source.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {source.name}
                    </a>
                  </div>
                </td>
                <td className="py-2 px-2 text-gray-600">{source.origin}</td>
                <td className="py-2 px-2 text-center">
                  <span className="font-bold text-sky-600">{source.days}</span>
                </td>
                <td className="py-2 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    source.type === 'Gratuita' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {source.type}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        Dados atualizados em tempo real de múltiplas fontes internacionais
      </p>
    </div>
  );
};
