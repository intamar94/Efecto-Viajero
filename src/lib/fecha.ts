export function diasEntre(fechaInicioISO: string, fechaFinISO: string): number {
  const inicio = new Date(fechaInicioISO);
  const fin = new Date(fechaFinISO);
  const ms = fin.getTime() - inicio.getTime();
  return Math.max(Math.round(ms / (1000 * 60 * 60 * 24)), 0);
}
