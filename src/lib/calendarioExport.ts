// Exportar el itinerario del viaje a un archivo .ics real (RFC 5545): lo
// abre cualquier app de calendario (Google Calendar, Apple Calendar,
// Outlook...) y cada quien lo importa a su propio calendario con dos
// toques. Es el equivalente honesto de "leer el calendario del teléfono"
// sin pedir una cuenta de Google ni una API de pago: la app no puede
// escribir directamente en el calendario del sistema desde la web, pero sí
// puede generar el archivo estándar que ese calendario sabe leer.

export interface EventoICS {
  uid: string;
  titulo: string;
  // "YYYY-MM-DD" para todo el día, o "YYYY-MM-DDTHH:mm" para hora exacta.
  inicio: string;
  fin?: string;
  ubicacion?: string;
  descripcion?: string;
}

function escaparTextoICS(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function esFechaSola(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function formatearFechaICS(valor: string): string {
  return valor.replace(/-/g, "");
}

function formatearFechaHoraICS(valor: string): string {
  const [fecha, hora] = valor.split("T");
  const horaCompacta = (hora ?? "00:00").replace(":", "");
  return `${formatearFechaICS(fecha)}T${horaCompacta.length === 4 ? `${horaCompacta}00` : horaCompacta}`;
}

function sumarUnDia(fechaISO: string): string {
  const d = new Date(fechaISO + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function generarICS(nombreCalendario: string, eventos: EventoICS[]): string {
  const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Efecto Viajero//ES", `X-WR-CALNAME:${escaparTextoICS(nombreCalendario)}`, "CALSCALE:GREGORIAN"];

  for (const ev of eventos) {
    const todoElDia = esFechaSola(ev.inicio);
    lineas.push("BEGIN:VEVENT", `UID:${ev.uid}`);
    if (todoElDia) {
      lineas.push(`DTSTART;VALUE=DATE:${formatearFechaICS(ev.inicio)}`);
      lineas.push(`DTEND;VALUE=DATE:${formatearFechaICS(ev.fin ?? sumarUnDia(ev.inicio))}`);
    } else {
      lineas.push(`DTSTART:${formatearFechaHoraICS(ev.inicio)}`);
      if (ev.fin) lineas.push(`DTEND:${formatearFechaHoraICS(ev.fin)}`);
    }
    lineas.push(`SUMMARY:${escaparTextoICS(ev.titulo)}`);
    if (ev.ubicacion) lineas.push(`LOCATION:${escaparTextoICS(ev.ubicacion)}`);
    if (ev.descripcion) lineas.push(`DESCRIPTION:${escaparTextoICS(ev.descripcion)}`);
    lineas.push("END:VEVENT");
  }

  lineas.push("END:VCALENDAR");
  return lineas.join("\r\n");
}

export function descargarICS(contenido: string, nombreArchivo: string) {
  const blob = new Blob([contenido], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
