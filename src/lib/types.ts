// Modelo de datos central de Efecto Viajero.
// Separación deliberada: datos permanentes del viajero (esta capa) vs.
// contexto específico de cada viaje (Viaje.contexto).

export type TipoDocumento = "pasaporte" | "dni" | "visado" | "permiso_conduccion" | "certificado" | "vacuna" | "microchip" | "otro";
export interface Documento { id: string; tipo: TipoDocumento; nombre?: string; lugarExpedicion?: string; fechaVencimiento?: string; }
export interface PersonaViajero { id: string; tipo: "persona"; nombre: string; apellido?: string; fechaNacimiento?: string; nacionalidad?: string; residencia?: string; documentos: Documento[]; createdAt: string; }
export interface MascotaViajero { id: string; tipo: "mascota"; nombre: string; especie?: string; raza?: string; fechaNacimiento?: string; pesoKg?: number; microchip?: string; documentos: Documento[]; createdAt: string; }
export type Viajero = PersonaViajero | MascotaViajero;
export type RitmoViaje = "tranquilo" | "medio" | "intenso";
export interface ContextoViaje { presupuestoTotal?: number; duracionDias?: number; numAdultos?: number; edadesMenores?: number[]; mascota?: boolean; ciudadOrigen?: string; }
export type ModoPlanificacion = "completo" | "poco_a_poco" | "dejarse_llevar";
export type ModoTransporte = "avion" | "tren" | "autobus" | "metro" | "taxi" | "coche_alquiler" | "a_pie" | "otro";
export interface TramoTransporte { id: string; modo: ModoTransporte; origen: string; destino: string; horaSalida?: string; costeEstimado?: number; notas?: string; }
export interface OpcionAlojamiento { id: string; nombre: string; ubicacion: "centro" | "afueras" | "cerca de estación/aeropuerto"; precioNoche: number; mascotaFriendly: boolean; pros: string[]; contras: string[]; }
export type EstadoActividad = "disponible" | "planificada" | "reservada" | "realizada" | "descartada";
export interface ActividadDestino { id: string; nombre: string; tipo: string; duracionHoras: number; costeEstimado: number; apta: string[]; entorno: "exterior" | "interior" | "mixto"; admiteMascotas: boolean; descripcion: string; }
export interface ActividadViaje { actividadId: string; estado: EstadoActividad; propia?: { nombre: string; duracionHoras?: number; costeEstimado?: number; entorno?: "exterior" | "interior" | "mixto"; admiteMascotas?: boolean; }; }
export type CategoriaDocumento = "vuelo" | "tren_bus" | "alojamiento" | "transporte_local" | "entrada" | "seguro" | "documento_personal" | "otro";
export interface DocumentoViaje { id: string; tipo: CategoriaDocumento; proveedor: string; referencia?: string; fecha?: string; hora?: string; direccion?: string; notas?: string; autoClasificado?: boolean; nombreArchivo?: string; }
export interface SouvenirDestino { id: string; nombre: string; origen: string; precioAprox: string; descripcion: string; datoCurioso: string; avisoEquipaje?: string; }
export interface Votacion { id: string; pregunta: string; opciones: string[]; votos: Record<string, string>; }

export type CategoriaRecuerdo = "food" | "sunset" | "nature" | "landmark" | "culture" | "people" | "family" | "activity" | "transport" | "event" | "accommodation" | "unknown";
export interface Recuerdo {
  id: string;
  titulo: string;
  fecha?: string;
  nota?: string;
  fotoDataUrl?: string;
  proveedorMedia?: "device" | "google-photos" | "icloud" | "onedrive" | "dropbox" | "other";
  referenciaMedia?: string;
  categorias?: CategoriaRecuerdo[];
  lugar?: string;
  diaViaje?: number;
  analizado?: boolean;
  seleccionadoPorUsuario?: boolean;
}

export type TipoViaje = "simple" | "circuito";
export interface Etapa { id: string; nombre: string; paisCodigo?: string; destinoId?: string; dias?: number; }
export interface Viaje {
  id: string; destino: string; destinoId?: string; paisCodigo?: string; tipo?: TipoViaje; etapas?: Etapa[]; viajerosIds: string[]; fechaSalida?: string; fechaRegreso?: string; contexto: ContextoViaje; createdAt: string;
  modoPlanificacion?: ModoPlanificacion; transporte: TramoTransporte[]; alojamientoId?: string; actividades: ActividadViaje[]; documentos: DocumentoViaje[];
  recuerdos: Recuerdo[]; votaciones: Votacion[]; souvenirs: string[]; gastos: string[];
}

export type TipoDestino = "ciudad" | "pueblo" | "zona" | "pais";
export interface Destino { id: string; nombre: string; paisCodigo: string; tipo: TipoDestino; descripcion?: string; latitud?: number; longitud?: number; }
