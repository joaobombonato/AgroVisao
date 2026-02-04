import { BaseRecord } from '../../../types/models';

export interface Chuva extends BaseRecord {
    data: string;
    local: string; // Estação (locais_monitoramento)
    milimetros: number;
}
