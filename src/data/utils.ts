export const U = {
  todayIso: () => new Date().toISOString().split('T')[0],
  currentMonthIso: () => new Date().toISOString().slice(0, 7),
  parseDecimal: (v: any) => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  },
  formatValue: (v: any) => {
    const n = typeof v === 'number' ? v : U.parseDecimal(v);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  formatInt: (v: any) => {
    const n = typeof v === 'number' ? v : U.parseDecimal(v);
    return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  },
  formatDate: (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    return `${d}/${m}/${y.slice(2)}`;
  },
  id: (prefix = '') => `${prefix}${Date.now()}`,
};