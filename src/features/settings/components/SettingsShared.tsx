import React from 'react';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '../../../components/ui/Shared';

interface MenuButtonProps {
    icon: any;
    title: string;
    desc: string;
    onClick: () => void;
    color?: string;
    badge?: string;
}

export function MenuButton({ icon: Icon, title, desc, onClick, color = 'bg-gray-50', badge }: MenuButtonProps) {
    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group hover:border-indigo-200 transition-all active:scale-95"
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} group-hover:bg-indigo-600 group-hover:text-white transition-colors`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800 group-hover:text-indigo-900 transition-colors uppercase tracking-tight text-sm">{title}</p>
                    {badge && <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">{badge}</span>}
                </div>
                <p className="text-[10px] text-gray-400 font-medium leading-tight">{desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
        </button>
    );
}

export function EditorContainer({ title, icon: Icon, color, children, onBack }: any) {
    return (
        <div className="space-y-6 p-4 pb-24 max-w-md mx-auto min-h-screen bg-gray-50/50">
            <PageHeader setTela={onBack} title={title} icon={Icon} colorClass={color} backTarget="menu" />
            {children}
        </div>
    );
}

export const getColorClasses = (color: string) => {
    const classes: any = {
        red: "bg-red-50 text-red-600 group-hover:bg-red-600",
        green: "bg-green-50 text-green-600 group-hover:bg-green-600",
        orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-600",
        blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600",
        cyan: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600",
        yellow: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-600",
        emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600",
        purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-600",
    };
    return classes[color] || "bg-gray-50 text-gray-600 group-hover:bg-gray-600";
};
