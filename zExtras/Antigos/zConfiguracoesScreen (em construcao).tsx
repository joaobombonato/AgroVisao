import React from 'react';
import { Settings } from 'lucide-react';
import { PageHeader } from '../components/ui/Shared';
import { useAppContext } from '../context/AppContext';

export default function ConfiguracoesScreen() {
  const { setTela } = useAppContext();
  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-600" />
      <div className="bg-white p-6 rounded-lg shadow-md text-center"><Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">Versão 3.4 - Fazenda São Caetano</p></div>
    </div>
  );
}