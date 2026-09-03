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
  nombre: string;
  numero?: string;
  fechaEmision?: string; // ISO date
  fechaVencimiento?: string; // ISO date
  notas?: string;
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
  ritmo?: RitmoViaje;
  intereses: string[]; // naturaleza, playa, gastronomia, aventura, ...
  restricciones: string[]; // "sin conducir mucho", "accesible", ...
  notas?: string;
}

export interface Viaje {
  id: string;
  destino: string;
  destinoId?: string; // referencia a Destino.id si viene del explorador
  viajerosIds: string[];
  fechaSalida: string; // ISO date
  fechaRegreso: string; // ISO date
  contexto: ContextoViaje;
  createdAt: string;
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
