/**
 * zarcUtils.ts - Utilitários para lógica de Regiões Edafoclimáticas (REC/ZARC)
 */

export const getREC = (municipio: any) => {
  if (!municipio) return '';
  
  const uf = municipio['microrregiao']?.['mesorregiao']?.['UF']?.sigla;
  const mesoId = String(municipio['microrregiao']?.['mesorregiao']?.id || '');
  
  // SÃO PAULO (Macro 3 e 2)
  if (uf === 'SP') {
      if (['3501', '3502', '3505', '3510', '3511'].includes(mesoId)) return 'M3 - 302';
      if (['3507', '3508', '3509'].includes(mesoId)) return 'M2 - 201';
      if (['3503', '3504', '3506', '3512'].includes(mesoId)) return 'M3 - 303';
      return 'REC_03';
  }

  // MINAS GERAIS & GOIÁS (Macro 3)
  if (uf === 'MG') {
      if (mesoId === '3101') return 'M3 - 304';
      if (mesoId === '3105' || mesoId === '3106') return 'M3 - 301';
      if (mesoId === '3102') return 'M3 - 303';
      return 'REC_05';
  }
  if (uf === 'GO') {
      if (['5204', '5205'].includes(mesoId)) return 'M3 - 301';
      if (['5201', '5202', '5203'].includes(mesoId)) return 'M3 - 302';
      return 'REC_07';
  }

  // MATO GROSSO (Macros 3 e 4)
  if (uf === 'MT') {
      if (['5101', '5102', '5103'].includes(mesoId)) return 'M4 - 401';
      if (mesoId === '5105') return 'M3 - 304';
      if (mesoId === '5104') return 'M4 - 402';
      return 'REC_09';
  }

  // MATO GROSSO DO SUL & PARANÁ (Macro 2)
  if (uf === 'MS') {
      if (mesoId === '5001') return 'M3 - 302'; 
      if (['5004', '5003', '5002'].includes(mesoId)) return 'M2 - 204';
      return 'REC_08';
  }
  if (uf === 'PR') {
      if (['4101', '4102', '4106'].includes(mesoId)) return 'M2 - 201';
      if (['4103', '4105', '4104'].includes(mesoId)) return 'M2 - 202';
      if (['4107', '4108', '4109', '4110'].includes(mesoId)) return 'M1 - 103';
      return 'REC_06';
  }

  // MATOPIBA (Macro 5 e 4)
  if (uf === 'BA') return mesoId === '2901' ? 'M5 - 501' : 'M5 - 502';
  if (uf === 'PI') return mesoId === '2204' ? 'M5 - 502' : 'M5 - 504';
  if (uf === 'MA') return mesoId === '2105' ? 'M5 - 504' : 'M5 - 503';
  if (uf === 'TO') return mesoId === '1702' ? 'M5 - 503' : 'M4 - 401';

  // RIO GRANDE DO SUL & SANTA CATARINA (Macro 1)
  if (uf === 'RS' || uf === 'SC') {
      if (['4301', '4302', '4201', '4202', '4203'].includes(mesoId)) return 'M1 - 102';
      if (['4305', '4306', '4303', '4304'].includes(mesoId)) return 'M1 - 101';
      if (['4307', '4204', '4206'].includes(mesoId)) return 'M1 - 103';
      return 'REC_06';
  }

  return 'REC_DEFAULT';
};
