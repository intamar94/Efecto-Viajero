import type { ActividadDestino, Destino, OpcionAlojamiento, SouvenirDestino } from "./types";

// Catálogo de demostración: se genera a partir de los atributos del
// destino en vez de mantener listas manuales por país. No sustituye una
// integración real con proveedores (eso es B20).
function semilla(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 97;
  return h;
}

export function alojamientosDe(destino: Destino): OpcionAlojamiento[] {
  const base = destino.presupuestoDiaEstimado.medio * 0.55;
  const s = semilla(destino.id);
  return [
    {
      id: `${destino.id}-aloj-centro`,
      nombre: `Alojamiento céntrico en ${destino.nombre}`,
      ubicacion: "centro",
      precioNoche: Math.round(base + (s % 10)),
      mascotaFriendly: destino.mascotaFriendly,
      pros: ["A pie de todo", "Menos desplazamientos"],
      contras: ["El más caro de las tres opciones"],
    },
    {
      id: `${destino.id}-aloj-afueras`,
      nombre: `Alojamiento con encanto cerca de ${destino.nombre}`,
      ubicacion: "afueras",
      precioNoche: Math.round(base * 0.75 + (s % 6)),
      mascotaFriendly: destino.mascotaFriendly,
      pros: ["Más barato", "Más tranquilo"],
      contras: ["Añade ~45 min de desplazamiento al día"],
    },
    {
      id: `${destino.id}-aloj-estacion`,
      nombre: "Alojamiento práctico junto a estación/aeropuerto",
      ubicacion: "cerca de estación/aeropuerto",
      precioNoche: Math.round(base * 0.9 + (s % 8)),
      mascotaFriendly: destino.mascotaFriendly,
      pros: ["Fácil llegar y salir"],
      contras: ["Menos ambiente alrededor"],
    },
  ];
}

export function actividadesDe(destino: Destino): ActividadDestino[] {
  const base = destino.presupuestoDiaEstimado.medio;
  // `admiteMascotas` no se inventa por actividad: depende de si el destino
  // es mascota-friendly Y de que la actividad sea de calle. Un museo no
  // admite perros aunque el país sí.
  const conPerro = destino.mascotaFriendly;

  const actividades: ActividadDestino[] = [
    {
      id: `${destino.id}-act-paseo`,
      nombre: `Paseo por el centro de ${destino.nombre}`,
      tipo: "cultura",
      duracionHoras: 2,
      costeEstimado: 0,
      apta: ["exterior", "familiar", "tranquilo"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Callejear sin prisa por las zonas más características.",
    },
    {
      id: `${destino.id}-act-gastro`,
      nombre: "Ruta gastronómica local",
      tipo: "gastronomia",
      duracionHoras: 2.5,
      costeEstimado: Math.round(base * 0.2),
      apta: ["interior", "exterior", "familiar"],
      entorno: "mixto",
      admiteMascotas: false,
      descripcion: "Probar platos y productos típicos de la zona.",
    },
    {
      id: `${destino.id}-act-museo`,
      nombre: "Museo o centro cultural",
      tipo: "cultura",
      duracionHoras: 2,
      costeEstimado: Math.round(base * 0.1) + 5,
      apta: ["interior", "familiar"],
      entorno: "interior",
      admiteMascotas: false,
      descripcion: "Buena opción si hace mal tiempo.",
    },
    {
      id: `${destino.id}-act-mercado`,
      nombre: "Mercado y compras locales",
      tipo: "compras",
      duracionHoras: 1.5,
      costeEstimado: Math.round(base * 0.08),
      apta: ["interior", "exterior", "familiar"],
      entorno: "mixto",
      admiteMascotas: false,
      descripcion: "Artesanía y productos típicos.",
    },
  ];

  if (destino.tags.includes("naturaleza") || destino.tags.includes("montana")) {
    actividades.push({
      id: `${destino.id}-act-naturaleza`,
      nombre: `Ruta de senderismo cerca de ${destino.nombre}`,
      tipo: "naturaleza",
      duracionHoras: 4,
      costeEstimado: 0,
      apta: ["exterior"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Sendero accesible con buenas vistas.",
    });
  }
  if (destino.tags.includes("playa")) {
    actividades.push({
      id: `${destino.id}-act-playa`,
      nombre: "Tarde de playa",
      tipo: "playa",
      duracionHoras: 3,
      costeEstimado: 0,
      apta: ["exterior", "familiar"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Tiempo libre junto al mar. Muchas playas restringen perros en temporada alta: conviene comprobar la señalización.",
    });
  }
  if (destino.tags.includes("pueblos")) {
    actividades.push({
      id: `${destino.id}-act-pueblo`,
      nombre: "Excursión a un pueblo cercano",
      tipo: "pueblos",
      duracionHoras: 4,
      costeEstimado: Math.round(base * 0.05),
      apta: ["exterior", "tranquilo"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Descubrir un pueblo tradicional a poca distancia.",
    });
  }

  return actividades;
}

// Consejos de compra a nivel país: antes pedía un Destino curado, así
// que en cualquier ciudad fuera del catálogo la pantalla quedaba vacía.
// Solo usaba el país, así que ahora recibe el país y ya está.
export function souvenirsDe(nombrePais: string): SouvenirDestino[] {
  const destino = { id: nombrePais.toLowerCase().replace(/\s+/g, "-"), pais: nombrePais };
  return [
    {
      id: `${destino.id}-sv-gastro`,
      nombre: `Producto gastronómico típico de ${destino.pais}`,
      origen: destino.pais,
      precioAprox: "5-15 €",
      descripcion: "Fácil de transportar y siempre queda bien como regalo.",
      datoCurioso: `Muchos productos gastronómicos de ${destino.pais} llevan denominación de origen — mirar la etiqueta ayuda a saber si es realmente de la zona y no una copia genérica.`,
      avisoEquipaje: "Si es líquido (aceite, licor, salsas), va en la maleta facturada: en cabina el límite suele ser 100 ml por envase.",
    },
    {
      id: `${destino.id}-sv-artesania`,
      nombre: "Artesanía local",
      origen: destino.pais,
      precioAprox: "10-30 €",
      descripcion: "Producto hecho a mano representativo de la zona.",
      datoCurioso: "La artesanía tradicional suele llevar el sello del taller — preguntar por él ayuda a distinguir la pieza local de una reproducción importada en serie.",
      avisoEquipaje: "Si es de cerámica, cristal u otro material frágil, mejor en cabina y bien protegida: en la maleta facturada se rompe con facilidad.",
    },
    {
      id: `${destino.id}-sv-textil`,
      nombre: "Textil o accesorio con motivos locales",
      origen: destino.pais,
      precioAprox: "8-25 €",
      descripcion: "Buena opción para regalos variados.",
      datoCurioso: `Los colores y motivos de los textiles suelen tener un significado propio de la región — preguntar en el mismo puesto suele ser la mejor forma de conocerlo.`,
    },
  ];
}
