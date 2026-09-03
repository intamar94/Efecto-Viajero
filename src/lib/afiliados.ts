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

export interface EnlaceBusqueda {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  url: string;
}

export function urlBusquedaAlojamiento(destino: string, checkin?: string, checkout?: string): string {
  const params = new URLSearchParams({ ss: destino });
  if (checkin) params.set("checkin", checkin);
  if (checkout) params.set("checkout", checkout);
  if (AFILIADO.bookingAid) params.set("aid", AFILIADO.bookingAid);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function urlAirbnb(destino: string, checkin?: string, checkout?: string): string {
  const params = new URLSearchParams();
  if (checkin) params.set("checkin", checkin);
  if (checkout) params.set("checkout", checkout);
  const query = params.toString();
  return `https://www.airbnb.com/s/${encodeURIComponent(destino)}/homes${query ? `?${query}` : ""}`;
}

function urlHostelworld(destino: string): string {
  return `https://www.hostelworld.com/search?search_keywords=${encodeURIComponent(destino)}`;
}

// Cada web cubre un tipo de viaje distinto, así que se presentan las
// cuatro con su para-qué en vez de empujar a una sola. Couchsurfing no
// tiene un patrón de URL de búsqueda público y estable: se enlaza su web
// general en vez de inventar parámetros que podrían no funcionar.
export function buscadoresAlojamiento(destino: string, checkin?: string, checkout?: string): EnlaceBusqueda[] {
  return [
    {
      id: "booking",
      nombre: "Booking.com",
      icono: "🏨",
      descripcion: "Hoteles y apartamentos, con cancelación gratis en muchas opciones.",
      url: urlBusquedaAlojamiento(destino, checkin, checkout),
    },
    {
      id: "airbnb",
      nombre: "Airbnb",
      icono: "🏡",
      descripcion: "Casas y pisos completos: sale mejor en grupo o estancias largas.",
      url: urlAirbnb(destino, checkin, checkout),
    },
    {
      id: "hostelworld",
      nombre: "Hostelworld",
      icono: "🛏️",
      descripcion: "Hostales y albergues: lo más barato y lo más social.",
      url: urlHostelworld(destino),
    },
    {
      id: "couchsurfing",
      nombre: "Couchsurfing",
      icono: "🛋️",
      descripcion: "Alojarse gratis con anfitriones locales. Hay que crear perfil y pedirlo con antelación.",
      url: "https://www.couchsurfing.com/",
    },
  ];
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
