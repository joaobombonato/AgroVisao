export type SettingsView = 'menu' | 'listas' | 'editor' | 'conta' | 'equipe' | 'permissoes' | 'fazenda' | 'parametros';

export interface SettingsCategory {
    title: string;
    color: string;
    barColor: string;
    items: string[];
}
