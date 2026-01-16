import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const PageHeader = ({ setTela, title, icon: Icon, colorClass, backTarget = 'principal' }: any) => (
  <div className="flex items-center justify-between mb-4 pb-2 border-b">
    <div className="flex items-center gap-2">
       <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
       <h1 className="text-xl font-bold text-gray-800">{title}</h1>
    </div>
    <button onClick={() => setTela(backTarget)} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors"><ArrowLeft className="w-4 h-4 ml-1" /> Voltar</button>
  </div>
);
