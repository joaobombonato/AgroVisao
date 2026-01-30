import React from 'react';

export const Input = ({ label, readOnly, numeric, mask, onChange, ...props }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    if (mask === 'integer') {
        const clean = val.replace(/\D/g, '');
        e.target.value = clean;
        if (onChange) onChange(e);
        return;
    }

    if (mask === 'percentage') {
        const clean = val.replace(/[^\d,]/g, '');
        const parts = clean.split(',');
        let v = parts[0];
        if (parts.length > 1) v += ',' + parts[1].slice(0, 2);
        
        // Limita a 100%
        const num = parseFloat(v.replace(',', '.'));
        if (num > 100) v = '100';
        
        e.target.value = v;
        if (onChange) onChange(e);
        return;
    }

    if (mask === 'decimal') {
        // Permite números e uma única vírgula
        let clean = val.replace(/[^\d,]/g, '');
        const parts = clean.split(',');
        if (parts.length > 2) clean = parts[0] + ',' + parts.slice(1).join('');
        
        let integerPart = parts[0].replace(/\D/g, '');
        if (integerPart) {
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }
        e.target.value = parts.length > 1 ? `${integerPart},${parts[1].slice(0, 2)}` : integerPart;
        if (onChange) onChange(e);
        return;
    }

    if (mask === 'metric') {
        const digits = val.replace(/\D/g, '');
        if (!digits) {
            e.target.value = '';
        } else {
            const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            e.target.value = formatted;
        }
        if (onChange) onChange(e);
        return;
    }

    if (mask === 'currency') {
        const digits = val.replace(/\D/g, '');
        if (!digits) {
            e.target.value = '';
        } else {
            const v = (Number(digits) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            e.target.value = v;
        }
        if (onChange) onChange(e);
        return;
    }

    if (mask === 'phone') {
        const digits = val.replace(/\D/g, '');
        let formatted = '';
        if (digits.length > 0) {
            if (digits.length <= 2) {
                formatted = `(${digits}`;
            } else if (digits.length <= 6) {
                formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
            } else if (digits.length <= 10) {
                formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
            } else {
                formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
            }
        }
        e.target.value = formatted;
        if (onChange) onChange(e);
        return;
    }

    if (numeric && onChange) {
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

export const Select = ({ label, children, className, ...props }: any) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600">{label}</p>
        <select 
            {...props} 
            className={`w-full px-3 py-2 border-2 rounded-lg bg-white border-gray-200 focus:border-blue-500 transition-all ${className || ''}`}
        >
            {children}
        </select>
    </div>
);
