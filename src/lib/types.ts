// Modelo de datos central de Efecto Viajero.
// Separación deliberada: datos permanentes del viajero (esta capa) vs.
// contexto específico de cada viaje (Viaje.contexto).

export type TipoDocumento =
  | "pasaporte"
  | "dni"
  | "visado"
  | "permiso_conduccion"
  | "certificado"
  | "vacuna"
  | "microchip"
  | "otro";

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  // Solo hace falta rellenarlo cuando el tipo por sí solo no identifica el
  // documento (ej. "vacuna" → "rabia"). Para el resto se usa la etiqueta
  // del tipo al mostrarlo.
  nombre?: string;
  lugarExpedicion?: string;
  fechaVencimiento?: string; // ISO date — "fecha válida" del documento
}

export interface PersonaViajero {
  id: string;
  tipo: "persona";
  nombre: string;
  apellido?: string;
  fechaNacimiento?: string; // ISO date
  nacionalidad?: string; // código ISO país, ej "ES"
  residencia?: string; // código ISO país
  documentos: Documento[];
  createdAt: string;
}

export interface MascotaViajero {
  id: string;
  tipo: "mascota";
  nombre: string;
  especie?: string; // perro, gato, ...
  raza?: string;
  fechaNacimiento?: string;
  pesoKg?: number;
  microchip?: string;
  documentos: Documento[];
  createdAt: string;
}

export type Viajero = PersonaViajero | MascotaViajero;

export type RitmoViaje = "tranquilo" | "medio" | "intenso";

export interface ContextoViaje {
  presupuestoTotal?: number;
  duracionDias?: number;
  // Lo que ya entendimos del texto libre en /planificar, antes de que el
  // usuario haya puesto nombre a nadie: cuántos adultos, edades de los
  // menores y si viaja una mascota. Sirve para no perder esa información
  // mientras no se han creado o asignado los viajeros de verdad.
  numAdultos?: number;
  edadesMenores?: number[];
  mascota?: boolean;
  // Ciudad desde la que se sale, no el destino. Se usa para las búsquedas
  // de vuelos (necesitan origen y destino) — no confundir con el origen
  // de un tramo de transporte concreto, que ya vive en TramoTransporte.
  ciudadOrigen?: string;
}

export type ModoPlanificacion = "completo" | "poco_a_poco" | "dejarse_llevar";

export type ModoTransporte =
  | "avion"
  | "tren"
  | "autobus"
  | "metro"
  | "taxi"
  | "coche_alquiler"
  | "a_pie"
  | "otro";

export interface TramoTransporte {
  id: string;
  modo: ModoTransporte;
  origen: string;
  destino: string;
  horaSalida?: string; // ISO datetime local, ej "2026-10-12T09:40"
  costeEstimado?: number;
  notas?: string;
}

export interface OpcionAlojamiento {
  id: string;
  nombre: string;
  ubicacion: "centro" | "afueras" | "cerca de estación/aeropuerto";
  precioNoche: number;
  mascotaFriendly: boolean;
  pros: string[];
  contras: string[];
}

export type EstadoActividad = "disponible" | "planificada" | "reservada" | "realizada" | "descartada";

export interface ActividadDestino {
  id: string;
  nombre: string;
  tipo: string; // naturaleza, gastronomia, cultura, playa, compras...
  duracionHoras: number;
  costeEstimado: number;
  apta: string[]; // interior, exterior, familiar, tranquilo...
  descripcion: string;
}

export interface ActividadViaje {
  actividadId: string; // referencia a ActividadDestino.id
  estado: EstadoActividad;
}

export interface DocumentoViaje {
  id: string;
  tipo: string; // vuelo, tren, hotel, seguro, otro
  proveedor: string;
  referencia?: string;
  fecha?: string;
  hora?: string;
  direccion?: string;
  notas?: string;
}

export interface SouvenirDestino {
  id: string;
  nombre: string;
  origen: string;
  precioAprox: string;
  descripcion: string;
  datoCurioso: string;
  avisoEquipaje?: string; // p. ej. líquidos o frágiles, para saber si va en cabina o facturado
}

export interface SouvenirAsignado {
  id: string;
  souvenirId: string;
  paraNombre: string;
}

export interface Votacion {
  id: string;
  pregunta: string;
  opciones: string[];
  votos: Record<string, string>; // nombreParticipante -> opción elegida
}

export interface Recuerdo {
  id: string;
  titulo: string;
  fecha?: string;
  nota?: string;
  fotoDataUrl?: string; // miniatura real de la foto elegida, redimensionada en el navegador
}

export interface Viaje {
  id: string;
  destino: string;
  destinoId?: string; // referencia a Destino.id si viene del explorador
  viajerosIds: string[];
  fechaSalida?: string; // ISO date; sin confirmar todavía si no está
  fechaRegreso?: string; // ISO date; sin confirmar todavía si no está
  contexto: ContextoViaje;
  createdAt: string;

  modoPlanificacion?: ModoPlanificacion;
  transporte: TramoTransporte[];
  alojamientoId?: string; // referencia a una OpcionAlojamiento generada por catalogo.ts
  actividades: ActividadViaje[];
  documentos: DocumentoViaje[];
  souvenirs: SouvenirAsignado[];
  participantes: string[]; // nombres, viaje compartido local
  votaciones: Votacion[];
  recuerdos: Recuerdo[];
}

export type EstadoRequisito = "verde" | "amarillo" | "rojo";

export type CategoriaRequisito =
  | "documentacion"
  | "visado"
  | "salud"
  | "mascota"
  | "conduccion"
  | "otros";

export interface ResultadoRequisito {
  viajeroId: string;
  viajeroNombre: string;
  categoria: CategoriaRequisito;
  estado: EstadoRequisito;
  titulo: string;
  motivo: string;
  fuente?: string;
  fechaComprobacion: string; // ISO date, para dejar claro que no es permanente
}

export interface Destino {
  id: string;
  nombre: string;
  pais: string;
  paisCodigo: string; // ISO usado por el motor de requisitos
  descripcion: string;
  tags: string[]; // naturaleza, playa, pueblos, gastronomia, aventura, romantico, ciudad, familiar
  ritmo: RitmoViaje[];
  presupuestoDiaEstimado: { bajo: number; medio: number; alto: number };
  mascotaFriendly: boolean;
  distanciaConduccionCorta: boolean; // "sin conducir demasiado"
  climaCalido: boolean;
}
