// Eventos estacionales por país: festivales, mercados temáticos, etc.
// Datos reales con fechas aproximadas

export interface EventoEstacional {
  nombre: string;
  pais: string;
  ciudad?: string;
  mes: number; // 1-12
  diasAproximados?: string; // "21-31 dic", "25 dic", "1-6 ene"
  tipo: "festival" | "mercado" | "feria" | "celebracion" | "evento";
  descripcion: string;
  notas?: string;
  sitioWeb?: string;
}

export const EVENTOS_POR_PAIS: Record<string, EventoEstacional[]> = {
  españa: [
    {
      nombre: "Navidad - Mercados navideños",
      pais: "España",
      mes: 12,
      diasAproximados: "1-31 dic",
      tipo: "mercado",
      descripcion: "Mercados navideños en ciudades principales: Madrid, Barcelona, Sevilla. Artesanía, decoraciones, comida típica.",
      notas: "Especialmente famosos: Plaza Mayor (Madrid), Feria de Santa Lucía (Barcelona). Abren desde principios de diciembre.",
    },
    {
      nombre: "Nochebuena y Navidad",
      pais: "España",
      mes: 12,
      diasAproximados: "24-25 dic",
      tipo: "celebracion",
      descripcion: "Celebraciones familiares. Las ciudades se iluminan, hay música en plazas, misas de Gallo.",
      notas: "Muchos restaurantes cierran. La tradición es cenar en familia. Lottería de Navidad: sorteo el 22 dic.",
    },
    {
      nombre: "Año Nuevo - Campanadas",
      pais: "España",
      mes: 1,
      diasAproximados: "31 dic-1 ene",
      tipo: "celebracion",
      descripcion: "Celebración tradicional: ver las campanadas de la Puerta del Sol (Madrid) en TV o en directo.",
      notas: "Tradición de comer 12 uvas al ritmo de las campanadas. Fiestas en calles principales.",
    },
    {
      nombre: "Feria de Abril",
      pais: "España",
      ciudad: "Sevilla",
      mes: 4,
      diasAproximados: "mediados abril (2 semanas)",
      tipo: "feria",
      descripcion: "La feria de primavera más famosa de España. Casetas, caballos, trajes de flamenca, sevillanas.",
      notas: "Se celebra en el Real de la Feria. Ambiente de fiesta de 9-10 días. Reserva hotel con anticipación.",
      sitioWeb: "https://www.feriaabrilsevilla.es/",
    },
    {
      nombre: "Tomatina",
      pais: "España",
      ciudad: "Buñol, Valencia",
      mes: 8,
      diasAproximados: "último miércoles de agosto",
      tipo: "festival",
      descripcion: "Festival más raro de Europa: batalla campal con tomates. 150.000 personas, 150 toneladas de tomates.",
      notas: "Reserva alojamiento en Valencia o Buñol. La batalla es a las 11:00. Llega sucio pero es inolvidable.",
      sitioWeb: "https://www.tomatina.es/",
    },
    {
      nombre: "Semana Santa",
      pais: "España",
      mes: 3,
      diasAproximados: "varía (mar-abr)",
      tipo: "celebracion",
      descripcion: "Procesiones religiosas con pasos (figuras talladas). Sevilla, Málaga, Valladolid tienen las más famosas.",
      notas: "Muchos días festivos. Las ciudades cierran parcialmente. Reserva con anticipación: hay mucho turismo.",
    },
  ],
  alemania: [
    {
      nombre: "Navidad - Weihnachtsmärkte",
      pais: "Alemania",
      mes: 12,
      diasAproximados: "1-24 dic",
      tipo: "mercado",
      descripcion: "Mercados navideños típicos alemanes (Weihnachtsmärkte): vino caliente (Glühwein), adornos artesanales, comida.",
      notas: "Famosos: Colonia, Dresde, Frankfurt, Núremberg. Abren por las tardes. Ambiente mágico y muy frío.",
      sitioWeb: "https://www.christmasmarkets.com/germany/",
    },
    {
      nombre: "Oktoberfest",
      pais: "Alemania",
      ciudad: "Múnich",
      mes: 9,
      diasAproximados: "mediados sep a primera semana oct (16 días)",
      tipo: "festival",
      descripcion: "Festival de cerveza más famoso del mundo. Cerveza, comida bávara, música, desfiles folclóricos.",
      notas: "Reserva hotel 6 meses antes. Las tiendas de campaña se llenan rápido. Prepárate para multitudes.",
      sitioWeb: "https://www.oktoberfest.de/en/",
    },
    {
      nombre: "Año Nuevo - Silvester",
      pais: "Alemania",
      mes: 1,
      diasAproximados: "31 dic-1 ene",
      tipo: "celebracion",
      descripcion: "Celebración de Año Nuevo con fuegos artificiales en plazas principales. Brandenburger Tor (Berlín) es el epicentro.",
      notas: "Berlín especialmente bulliciosa. Prepárate para multitudes enormes (millones en Berlín).",
    },
    {
      nombre: "Carnaval",
      pais: "Alemania",
      ciudad: "Colonia, Düsseldorf",
      mes: 2,
      diasAproximados: "varía (ene-mar)",
      tipo: "festival",
      descripcion: "Carnaval alemán (Karneval): desfiles, disfraces, música, cerveza. Los viernes antes del Miércoles de Ceniza.",
      notas: "Colonia es la capital del Carnaval Renano. Ambiente de fiesta, mucho alcohol, disfraces creativos.",
    },
  ],
  colombia: [
    {
      nombre: "Carnaval de Barranquilla",
      pais: "Colombia",
      ciudad: "Barranquilla",
      mes: 2,
      diasAproximados: "4-5 días antes del Miércoles de Ceniza (varía)",
      tipo: "festival",
      descripcion: "Segundo carnaval más grande del mundo (después de Río). Música, danza, disfraces, comparsas coloridas.",
      notas: "La ciudad se detiene. Ambiente increíble pero muy caluroso y abarrotado. Reserva anticipadamente.",
      sitioWeb: "https://www.carnavaldebarranquilla.org/",
    },
    {
      nombre: "Feria de Manizales",
      pais: "Colombia",
      ciudad: "Manizales",
      mes: 1,
      diasAproximados: "6-17 enero",
      tipo: "feria",
      descripcion: "Feria cultural del Eje Cafetero: música, desfiles de caballos, peleas de gallos, comida regional.",
      notas: "Celebra la tradición cafetera colombiana. Ambiente folclórico, muy local.",
    },
    {
      nombre: "Navidad",
      pais: "Colombia",
      mes: 12,
      diasAproximados: "8-31 dic",
      tipo: "celebracion",
      descripcion: "Temporada navideña: decoraciones, villancicos, fiestas familiares. Novena de Aguinaldos (rezos tradicionales).",
      notas: "Muchas ciudades tienen iluminaciones especiales. Bogotá tiene paseo de las luces en Eje Cafetero.",
    },
    {
      nombre: "Feria de Flores",
      pais: "Colombia",
      ciudad: "Medellín",
      mes: 8,
      diasAproximados: "primera semana de agosto",
      tipo: "festival",
      descripcion: "Feria de Flores de Medellín: desfiles de silletas (estructuras con flores), música, cultura.",
      notas: "Transformación de la ciudad con flores de colores. Celebra la llegada de la primavera andina.",
      sitioWeb: "https://www.feriadedelasflores.com/",
    },
  ],
  "reino unido": [
    {
      nombre: "Navidad",
      pais: "Reino Unido",
      mes: 12,
      diasAproximados: "1-31 dic",
      tipo: "celebracion",
      descripcion: "Navidad británica: tiendas decoradas, mercados, Oxford Street iluminada, West End Christmas shows.",
      notas: "Londres es especialmente festivo. Muchas atracciones cierran el 25-26 dic. Mucho turismo.",
    },
    {
      nombre: "Año Nuevo - Hogmanay (Escocia)",
      pais: "Reino Unido",
      ciudad: "Edimburgo",
      mes: 1,
      diasAproximados: "31 dic-2 ene",
      tipo: "celebracion",
      descripcion: "Celebración escocesa de Año Nuevo (Hogmanay): fuegos artificiales, fiestas callejeras, atmosphere única.",
      notas: "Edimburgo es el epicentro. Las ciudades escocesas tienen celebraciones tradicionales y festivas.",
    },
    {
      nombre: "Chelsea Flower Show",
      pais: "Reino Unido",
      ciudad: "Londres",
      mes: 5,
      diasAproximados: "mediados mayo (5 días)",
      tipo: "evento",
      descripcion: "Exposición de flores más prestigiosa del mundo. Diseños de jardines, flores raras, asistencia de realeza.",
      notas: "Entrada es difícil de conseguir. Requiere membresía de la RHS o ser invitado. Atmosfera muy británica.",
      sitioWeb: "https://www.rhs.org.uk/shows-events/rhs-chelsea-flower-show",
    },
    {
      nombre: "Trooping the Colour",
      pais: "Reino Unido",
      ciudad: "Londres",
      mes: 6,
      diasAproximados: "segundo sábado de junio",
      tipo: "evento",
      descripcion: "Desfile oficial de celebración del cumpleaños real. Uniforms militares, bandas, ceremonias.",
      notas: "Espectáculo muy británico. Se puede ver desde el Mall. Llega temprano para buen asiento.",
    },
  ],
};

export function eventosEnMes(nombrePais: string, mes: number): EventoEstacional[] {
  const paisClave = nombrePais.toLowerCase().trim();
  const eventos = EVENTOS_POR_PAIS[paisClave] ?? [];
  return eventos.filter((e) => e.mes === mes);
}

export function eventosEnPeriodo(nombrePais: string, mesInicio: number, mesFin: number): EventoEstacional[] {
  const paisClave = nombrePais.toLowerCase().trim();
  const eventos = EVENTOS_POR_PAIS[paisClave] ?? [];
  return eventos.filter((e) => {
    if (mesInicio <= mesFin) {
      return e.mes >= mesInicio && e.mes <= mesFin;
    }
    // Periodo que cruza año (ej: dic a feb)
    return e.mes >= mesInicio || e.mes <= mesFin;
  });
}

export function todosLosEventos(nombrePais: string): EventoEstacional[] {
  const paisClave = nombrePais.toLowerCase().trim();
  return EVENTOS_POR_PAIS[paisClave] ?? [];
}
