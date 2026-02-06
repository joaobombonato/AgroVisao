export interface InsuranceCommonData {
    seguradora: string;
    corretora: string;
    numero_apolice: string;
    vencimento_seguro: string;
    classe_bonus: string | number;
}

export interface MachineInsuranceData {
    valor_seguro_pago: string | number;
    valor_cobertura: string | number;
    franquia_geral: string | number;
    franquia_geral_porc: string | number;
    cobertura_eletrica: string | number;
    franquia_eletrica: string | number;
    franquia_eletrica_porc: string | number;
    franquia_vidros: string | number;
}

export interface InsuranceState {
    [machineId: string]: MachineInsuranceData;
}
