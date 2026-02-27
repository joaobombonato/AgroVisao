import { BaseRecord } from '../../../types/models';

export interface Chuva extends BaseRecord {
    data: string;
    local: string; // Estação (estacoes_chuva)
    milimetros: number;
}
