import { BaseRecord } from '../../../types/models';

export interface Maquina extends BaseRecord {
    nome: string;
}

export interface Talhao extends BaseRecord {
    nome: string;
    area_ha?: number;
}

export interface CentroCusto extends BaseRecord {
    nome: string;
}

export interface Produto extends BaseRecord {
    nome: string;
    categoria?: string;
    unidade?: string;
}
