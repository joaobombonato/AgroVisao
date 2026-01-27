import React from 'react';

export const Input = ({ label, readOnly, numeric, onChange, ...props }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (numeric && onChange) {
      const val = e.target.value;
      // Permite apenas números, uma única vírgula ou um único ponto
      const regex = /^[0-9]*[.,]?[0-9]*$/;
      if (regex.test(val)) {
        onChange(e);
      }
    } else if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <input 
        {...props} 
        onChange={handleChange}
        className={`w-full px-3 py-2 border-2 rounded-lg transition-colors ${
          readOnly 
            ? 'bg-gray-100 text-gray-600 font-semibold border-gray-300 cursor-not-allowed' 
            : 'border-gray-200 focus:border-blue-500 bg-white'
        }`} 
        readOnly={readOnly} 
      />
    </div>
  );
};

export const Select = ({ label, children, ...props }: any) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600">{label}</p>
        <select {...props} className="w-full px-3 py-2 border-2 rounded-lg bg-white border-gray-200 focus:border-blue-500">{children}</select>
    </div>
);
