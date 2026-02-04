/**
 * useDebounce - Hook para debounce de valores e funções
 * 
 * Encapsula a lógica de debounce para evitar chamadas excessivas
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook que retorna um valor com debounce
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 300ms)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook que retorna uma função com debounce
 * @param fn - Função a ser debounced
 * @param delay - Delay em milissegundos (padrão: 300ms)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  
  // Manter a referência da função atualizada
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  }, [delay]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

/**
 * Hook para debounce com valor imediato opcional
 * Útil para busca: mostra o valor digitado imediatamente, mas debounce a busca
 */
export function useDebounceWithImmediate<T>(value: T, delay = 300): {
  debouncedValue: T;
  immediateValue: T;
  isPending: boolean;
} {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(true);
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return {
    debouncedValue,
    immediateValue: value,
    isPending
  };
}
