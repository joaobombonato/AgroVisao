import React from 'react';
import { Download, FileSpreadsheet, ChevronRight } from 'lucide-react';
import type { ReportDef } from '../config/reportDefinitions';

interface ReportCardProps {
  rel: ReportDef;
  onExportPdf: () => void;
  onExportExcel: () => void;
}

export default function ReportCard({ rel, onExportPdf, onExportExcel }: ReportCardProps) {
  const Icon = rel.icon;

  return (
    <div className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm hover:border-gray-200 transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className={`p-3 ${rel.iconBg} ${rel.iconColor} rounded-xl ${rel.iconHoverBg} group-hover:text-white transition-colors`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${rel.catColor}`}>{rel.categoria}</span>
            <h3 className="font-bold text-gray-800 text-base">{rel.titulo}</h3>
            <p className="text-[9px] text-gray-400 mt-1 leading-tight">{rel.desc}</p>
          </div>
        </div>
        <button className="text-gray-300 hover:text-indigo-600 p-1">
          <ChevronRight className="w-5 h-5"/>
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
        <button
          onClick={onExportPdf}
          className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors active:scale-95"
        >
          <Download className="w-3.5 h-3.5" /> PDF
        </button>
        <button
          onClick={onExportExcel}
          className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors active:scale-95"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> EXCEL
        </button>
      </div>
    </div>
  );
}
