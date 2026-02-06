/**
 * Shared Hooks - Exportação Centralizada
 * 
 * Hooks reutilizáveis para todo o projeto
 */

// Hooks genéricos (Pasta hooks)
export * from './useDebounce';
export * from './useGeocoding';
export * from './useImageCrop';

// Hooks de Feature (referenciados aqui para facilidade de import, opcional)
export { useEstoqueDiesel } from '../features/fuel/hooks/useEstoqueDiesel';
export { useEstoqueProdutos } from '../features/assets/hooks/useEstoque'; // Movido
export { useFazendaForm } from '../features/farm/hooks/useFazendaForm'; // Movido


