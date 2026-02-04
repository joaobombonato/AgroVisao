/**
 * EstoquePainel - Painel de visualização do estoque de diesel
 * 
 * Extraído de AbastecimentoScreen para reutilização
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { U } from '../../../utils';
import { useEstoqueDiesel } from '../../../hooks';

export function EstoquePainel() {
  const { 
    estoqueAtual, 
    capacidadeTanque, 
    percentualTanque, 
    nivelCritico 
  } = useEstoqueDiesel();

  return (
    <div className={`rounded-xl p-4 text-white shadow-lg transition-colors ${nivelCritico ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
      <div className="flex flex-col items-center justify-center mb-2">
        <p className="text-xs font-bold uppercase opacity-80 mb-1">Estoque Disponível</p>
        <p className="text-4xl font-black tracking-tighter text-center">
          {U.formatInt(estoqueAtual)} <span className="text-lg font-medium">L</span>
        </p>
      </div>
      
      <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${nivelCritico ? 'bg-yellow-300' : 'bg-white'}`} 
          style={{ width: `${percentualTanque.toFixed(0)}%` }}
        />
      </div>
      
      <p className="text-xs opacity-80 mt-1 text-center font-bold">
        {percentualTanque.toFixed(0)}% (Tanque {U.formatInt(capacidadeTanque)}L)
      </p>

      {nivelCritico && (
        <span className="flex items-center justify-center gap-1 text-xs font-bold bg-yellow-400 text-red-900 px-2 py-1 rounded mt-2 animate-bounce">
          <AlertTriangle className="w-3 h-3"/> ESTOQUE CRÍTICO
        </span>
      )}
    </div>
  );
}
