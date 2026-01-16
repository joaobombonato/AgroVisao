import React from 'react';
import { ChartNoAxesCombined, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/ui/Shared';
import { useAppContext } from '../context/AppContext';

export default function GraficosScreen() {
  const { setTela } = useAppContext();
  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Gráficos" icon={ChartNoAxesCombined} colorClass="bg-purple-600" />
      <div className="bg-white p-6 rounded-lg shadow-md text-center"><TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" /><p className="text-gray-600">Módulo em desenvolvimento. Em breve visualização de dados.</p></div>
    </div>
  );
}