// Conversions date locale <-> ISO ('YYYY-MM-DD') pour les valeurs DRF DateField. Volontairement pas
// basé sur UTC (Date#toISOString) — cela décalerait la date à travers minuit pour tout utilisateur
// qui n'est pas sur UTC.
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
