// Contactos de emergencia por país de destino.
//
// Regla de honestidad de este archivo: aquí solo van datos públicos y
// estables (números nacionales de emergencia, webs oficiales de policía o
// del organismo de turismo del país). NO se inventan teléfonos ni correos
// de consulados: el consulado que le sirve a cada viajero depende de SU
// nacionalidad, no del destino, así que eso se resuelve con una búsqueda
// real construida con la nacionalidad que ya tenemos registrada.
export interface ContactoPais {
  emergencias: string;
  // Web oficial de la autoridad del país (policía u organismo de turismo).
  // Se omite cuando no se tiene certeza del dominio oficial: es mejor no
  // dar un enlace que dar uno equivocado en una urgencia.
  autoridad?: { nombre: string; url: string };
  telefonoTurista?: string;
}

export const CONTACTOS_POR_PAIS: Record<string, ContactoPais> = {
  SI: { emergencias: "112 (emergencias) · 113 (policía)", autoridad: { nombre: "Policía de Eslovenia", url: "https://www.policija.si" } },
  AT: { emergencias: "112 (emergencias) · 133 (policía)", autoridad: { nombre: "Policía de Austria", url: "https://www.polizei.gv.at" } },
  DE: { emergencias: "112 (emergencias) · 110 (policía)", autoridad: { nombre: "Policía de Alemania", url: "https://www.polizei.de" } },
  PT: { emergencias: "112", autoridad: { nombre: "PSP — Policía de Seguridad Pública", url: "https://www.psp.pt" } },
  IT: { emergencias: "112 (emergencias) · 113 (policía)", autoridad: { nombre: "Polizia di Stato", url: "https://www.poliziadistato.it" } },
  ES: { emergencias: "112 (emergencias) · 091 (policía nacional)", autoridad: { nombre: "Policía Nacional", url: "https://www.policia.es" } },
  GR: { emergencias: "112 (emergencias) · 100 (policía)", autoridad: { nombre: "Policía Helénica", url: "https://www.astynomia.gr" } },
  CR: { emergencias: "911", autoridad: { nombre: "Instituto Costarricense de Turismo", url: "https://www.ict.go.cr" } },
  MA: { emergencias: "19 (policía) · 15 (ambulancia) · 177 (gendarmería, carretera)" },
  TH: {
    emergencias: "191 (policía) · 1669 (ambulancia)",
    telefonoTurista: "1155 (policía turística, atiende en inglés)",
    autoridad: { nombre: "Autoridad de Turismo de Tailandia", url: "https://www.tourismthailand.org" },
  },
  CO: { emergencias: "123", autoridad: { nombre: "Policía Nacional de Colombia", url: "https://www.policia.gov.co" } },
  JP: {
    emergencias: "110 (policía) · 119 (ambulancia y bomberos)",
    telefonoTurista: "050-3816-2787 (línea de ayuda al visitante, 24 h)",
    autoridad: { nombre: "Organización Nacional de Turismo de Japón", url: "https://www.jnto.go.jp" },
  },
};

// Búsqueda real del consulado que corresponde al viajero. No es un dato
// inventado: es una búsqueda construida con su nacionalidad y el país de
// destino, que es exactamente lo que hay que buscar en esa situación.
export function urlBuscarConsulado(paisDestino: string, nacionalidad?: string): string {
  const consulta = nacionalidad
    ? `embajada o consulado de ${nacionalidad} en ${paisDestino}`
    : `embajada de mi país en ${paisDestino}`;
  return `https://www.google.com/search?q=${encodeURIComponent(consulta)}`;
}

// Misma idea que arriba pero en Google Maps: normalmente muestra teléfono,
// dirección y horario del sitio directamente en la ficha, sin tener que
// entrar a una web. Útil para embajadas, comisarías, hospitales o
// veterinarios: en una urgencia, un teléfono a un clic es mejor que un enlace
// a una web que hay que rebuscar.
export function urlMapsCercaDeMi(consulta: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(consulta)}`;
}

export function urlMapsConsulado(paisDestino: string, nacionalidad?: string): string {
  const consulta = nacionalidad
    ? `embajada o consulado de ${nacionalidad} en ${paisDestino}`
    : `embajada en ${paisDestino}`;
  return urlMapsCercaDeMi(consulta);
}
