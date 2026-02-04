import { BaseRecord } from '../../../types/models';

export interface Abastecimento extends BaseRecord {
    data: string;
    maquina: string;
    combustivel: string | 'Diesel S10' | 'Diesel S500' | 'Arla 32';
    quantidade: number;
    horimetro: number;
    operador?: string;
    talhao?: string;
    obs?: string;
}
