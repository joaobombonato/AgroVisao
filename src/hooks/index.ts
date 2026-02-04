/**
 * Shared Hooks - Exportação Centralizada
 * 
 * Hooks reutilizáveis para todo o projeto
 */

// Hooks genéricos (Pasta hooks)
export { useGeocoding } from './useGeocoding';
export { useImageCrop } from './useImageCrop';
export { useDebounce, useDebouncedCallback, useDebounceWithImmediate } from './useDebounce';

// Hooks de Feature (referenciados aqui para facilidade de import, opcional)
export { usePolygonEditor } from '../features/map/hooks/usePolygonEditor';
export { useEstoqueDiesel } from '../features/fuel/hooks/useEstoqueDiesel';
export { useEstoqueProdutos } from '../features/assets/hooks/useEstoque'; // Movido
export { useFazendaForm } from '../features/farm/hooks/useFazendaForm'; // Movido


