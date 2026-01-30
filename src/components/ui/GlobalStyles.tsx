import React from 'react';

export const GlobalStyles = () => (
    <style>{`
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      input[type=number]::-webkit-inner-spin-button, 
      input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }

      /* Força as datas a aparecerem em MAIÚSCULO como solicitado */
      input[type="date"]::-webkit-datetime-edit,
      input[type="date"]::-webkit-datetime-edit-fields-wrapper,
      input[type="date"]::-webkit-datetime-edit-text,
      input[type="date"]::-webkit-datetime-edit-day-field,
      input[type="date"]::-webkit-datetime-edit-month-field,
      input[type="date"]::-webkit-datetime-edit-year-field {
        text-transform: uppercase !important;
      }
    `}</style>
);
