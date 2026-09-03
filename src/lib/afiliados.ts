// Enlaces de salida a buscadores reales de vuelos/alojamiento. La reserva
// se completa en la web del proveedor — Efecto Viajero no vende ni cobra
// nada todavía. Para que estos enlaces generen comisión de verdad hace
// falta un ID de un programa de afiliados real (p. ej. Booking.com
// Partner Program, o un agregador como TravelPayouts que cubre vuelos +
// hoteles + trenes con una sola cuenta). Eso implica alta, verificación y
// datos bancarios: un paso de negocio que no se puede completar desde una
// sesión de código. Rellena el ID aquí cuando lo tengas.
export const AFILIADO = {
  bookingAid: "", // Partner ID de Booking.com Affiliate Partner Program
};

export function urlBusquedaAlojamiento(destino: string, checkin?: string, checkout?: string): string {
  const params = new URLSearchParams({ ss: destino });
  if (checkin) params.set("checkin", checkin);
  if (checkout) params.set("checkout", checkout);
  if (AFILIADO.bookingAid) params.set("aid", AFILIADO.bookingAid);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export function urlBusquedaVuelos(destino: string, origen?: string, fechaSalida?: string, fechaRegreso?: string): string {
  const partes = [`Vuelos a ${destino}`];
  if (origen) partes.push(`desde ${origen}`);
  if (fechaSalida) partes.push(`el ${fechaSalida}`);
  if (fechaRegreso) partes.push(`volviendo el ${fechaRegreso}`);
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(partes.join(" "))}`;
}

// Trainline y FlixBus no tienen un patrón de URL de búsqueda público y
// estable con origen/destino/fecha — enlazamos a su web general en vez de
// inventar parámetros que podrían no funcionar.
export const URL_TREN = "https://www.trainline.com/";
export const URL_BUS = "https://www.flixbus.es/";
