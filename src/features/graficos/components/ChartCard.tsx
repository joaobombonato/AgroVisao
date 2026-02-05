import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ChartCardProps {
    title: string;
    icon: LucideIcon;
    color: string;
    children: React.ReactNode;
}

export function ChartCard({ title, icon: Icon, color, children }: ChartCardProps) {
    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-700">{title}</h3>
            </div>
            {children}
        </div>
    );
}
