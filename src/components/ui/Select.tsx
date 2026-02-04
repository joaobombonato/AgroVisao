import React from 'react';

export const Select = ({ label, children, className, ...props }: any) => (
    <div className="space-y-1">
        {label && <p className="text-xs font-medium text-gray-600">{label}</p>}
        <select 
            {...props} 
            className={`w-full px-3 py-2 border-2 rounded-lg bg-white border-gray-200 focus:border-blue-500 transition-all ${className || ''}`}
        >
            {children}
        </select>
    </div>
);
