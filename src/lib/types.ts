import type { Investigacion } from "./investigacion";

// Modelo de datos central de Efecto Viajero.
// Separación deliberada: datos permanentes del viajero vs. contexto específico del viaje.

export type TipoDocumento =
  | "pasaporte" | "dni" | "visado" | "permiso_conduccion" | "certificado"
  | "vacuna" | "microchip" | "otro";

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  nombre?: string;
  lugarExpedicion?: string;
  fechaVencimiento?: string;
}

export interface PersonaViajero {
  id: string;
  tipo: "persona";
  nombre: string;
  apellido?: string;
  fechaNacimiento?: string;
  nacionalidad?: string;
  residencia?: string;
  documentos: Documento[];
  createdAt: string;
}

export interface MascotaViajero {
  id: string;
  tipo: "mascota";
  nombre: string;
  especie?: string;
  raza?: string;
  fechaNacimiento?: string;
  pesoKg?: number;
  microchip?: string;
  documentos: Documento[];
  createdAt: string;
}

export type Viajero = PersonaViajero | MascotaViajero;
export type RitmoViaje = "tranquilo" | "medio" | "intenso";

export interface AccesibilidadViaje {
  requiereAccesibilidad: boolean;
  movilidad?: "ninguna" | "ayudas_movilidad" | "movilidad_reducida" | "silla_ruedas";
  auditiva?: boolean;
  visual?: boolean;
  cognitiva?: boolean;
  otras?: string[];
}

export type TipoPresupuesto = "total" | "por_persona" | "por_dia";

export interface PresupuestoViaje {
  importe?: number;
  moneda: string;
  tipo: TipoPresupuesto;
  flexible?: boolean;
}

export interface ComposicionViaje {
  adultos: number;
  ninos: number;
  edadesNinos?: number[];
  bebes?: number;
  personasMayores?: number;
  accesibilidad?: AccesibilidadViaje;
  mascotas?: number;
}

export interface ContextoExplorer {
  activado: boolean;
  intencionActual?: string;
  tiempoDisponibleHoras?: number;
  preferenciasTemporales?: string[];
}

export interface ContextoViaje {
  presupuestoTotal?: number;
  duracionDias?: number;
  numAdultos?: number;
  edadesMenores?: number[];
  mascota?: boolean;
  ciudadOrigen?: string;

  // Contexto completo que alimenta al Travel Brain.
  textoOriginal?: string;
  presupuesto?: PresupuestoViaje;
  viajeros?: ComposicionViaje;
  accesibilidad?: AccesibilidadViaje;
  intereses?: string[];
  preferenciasComida?: string[];
  ritmo?: RitmoViaje;
  preferenciasTransporte?: string[];
  restricciones?: string[];
  fechaSalida?: string;
  fechaRegreso?: string;
  destinoNoDefinido?: boolean;
  explorer?: ContextoExplorer;
}

export type ModoPlanificacion = "completo" | "poco_a_poco" | "dejarse_llevar";
export type ModoTransporte = "avion" | "tren" | "autobus" | "metro" | "taxi" | "coche_alquiler" | "a_pie" | "otro";

export interface TramoTransporte {
  id: string;
  modo: ModoTransporte;
  origen: string;
  destino: string;
  horaSalida?: string;
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
  tipo: string;
  duracionHoras: number;
  costeEstimado: number;
  apta: string[];
  entorno: "exterior" | "interior" | "mixto";
  admiteMascotas: boolean;
  descripcion: string;
}

export interface ActividadViaje {
  actividadId: string;
  estado: EstadoActividad;
  propia?: {
    nombre: string;
    duracionHoras?: number;
    costeEstimado?: number;
    entorno?: "exterior" | "interior" | "mixto";
    admiteMascotas?: boolean;
  };
}

export type CategoriaDocumento = "vuelo" | "tren_bus" | "alojamiento" | "transporte_local" | "entrada" | "seguro" | "documento_personal" | "otro";

export interface DocumentoViaje {
  id: string;
  tipo: CategoriaDocumento;
  proveedor: string;
  referencia?: string;
  fecha?: string;
  hora?: string;
  direccion?: string;
  notas?: string;
  autoClasificado?: boolean;
  nombreArchivo?: string;
}

export interface SouvenirDestino {
  id: string;
  nombre: string;
  origen: string;
  precioAprox: string;
  descripcion: string;
  datoCurioso: string;
  avisoEquipaje?: string;
}

export interface Votacion { id: string; pregunta: string; opciones: string[]; votos: Record<string, string>; }
export interface Recuerdo { id: string; titulo: string; fecha?: string; nota?: string; fotoDataUrl?: string; }
export type TipoViaje = "simple" | "circuito";

export interface Etapa {
  id: string;
  nombre: string;
  paisCodigo?: string;
  destinoId?: string;
  dias?: number;
}

export interface Viaje {
  id: string;
  destino: string;
  destinoId?: string;
  paisCodigo?: string;
  tipo?: TipoViaje;
  etapas?: Etapa[];
  viajerosIds: string[];
  fechaSalida?: string;
  fechaRegreso?: string;
  contexto: ContextoViaje;
  createdAt: string;
  modoPlanificacion?: ModoPlanificacion;
  transporte: TramoTransporte[];
  alojamientoId?: string;
  actividades: ActividadViaje[];
  documentos: DocumentoViaje[];
  participantes: string[];
  votaciones: Votacion[];
  recuerdos: Recuerdo[];
  // Lo que el Travel Brain averiguó al crear el viaje (sitios reales,
  // clima, moneda) ya recortado. Sin guardarlo, esa investigación se
  // perdía al salir de /planificar y había que volver a pedirla.
  investigacion?: Investigacion;
  itinerario?: Itinerario;
}

export type EstadoRequisito = "verde" | "amarillo" | "rojo";
export type CategoriaRequisito = "documentacion" | "visado" | "salud" | "mascota" | "conduccion" | "otros";
export interface ResultadoRequisito {
  viajeroId: string;
  viajeroNombre: string;
  categoria: CategoriaRequisito;
  estado: EstadoRequisito;
  titulo: string;
  motivo: string;
  fuente?: string;
  fechaComprobacion: string;
}

export interface TransporteLocal { medios: string[]; comoSePaga: string; apps?: string; aviso?: string; }

export type RitmoPreferencia = "tranquilo" | "normal" | "intenso";

export interface ActividadEnHorario {
  actividadId: string;
  horaInicio: string;
  horaFin: string;
  notas?: string;
  confirmada: boolean;
}

export interface DiaItinerario {
  fecha: string;
  dia: number;
  etapa?: string;
  actividades: ActividadEnHorario[];
  descansoTotal: boolean;
  notas?: string;
}

export interface PreferenciaItinerario {
  ritmo: RitmoPreferencia;
  permitirDescansos: boolean;
  permitirMadrugadas: boolean;
  horaLlegada?: string;
  horaSalida?: string;
  generada?: boolean;
  timestamp?: string;
}

export interface Itinerario {
  dias: DiaItinerario[];
  preferencias: PreferenciaItinerario;
  generadoEn?: string;
  version: number;
}

export interface Destino {
  id: string;
  nombre: string;
  pais: string;
  paisCodigo: string;
  descripcion: string;
  tags: string[];
  ritmo: RitmoViaje[];
  presupuestoDiaEstimado: { bajo: number; medio: number; alto: number };
  mascotaFriendly: boolean;
  distanciaConduccionCorta: boolean;
  climaCalido: boolean;
}
