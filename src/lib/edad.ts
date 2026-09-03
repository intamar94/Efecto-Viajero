export function calcularEdad(fechaNacimientoISO?: string, referencia = new Date()): number | null {
  if (!fechaNacimientoISO) return null;
  const nacimiento = new Date(fechaNacimientoISO);
  if (Number.isNaN(nacimiento.getTime())) return null;

  let edad = referencia.getFullYear() - nacimiento.getFullYear();
  const cumpleEsteAnio = new Date(referencia.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  if (referencia < cumpleEsteAnio) edad -= 1;
  return Math.max(edad, 0);
}
