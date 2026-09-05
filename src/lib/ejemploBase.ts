import type { PersonaViajero, Viaje } from "./types";
import { generarId } from "./id";

export const VIAJEROS_EJEMPLO: PersonaViajero[] = [
  {
    id: "v1",
    nombre: "Ana",
    apellido: "García",
    tipo: "persona",
    fechaNacimiento: "1990-03-15",
    nacionalidad: "ES",
    residencia: "Madrid",
    documentos: [{ id: "d1", tipo: "pasaporte", nombre: "E12345678", fechaVencimiento: "2030-01-10" }],
    createdAt: new Date().toISOString(),
  },
  {
    id: "v2",
    nombre: "Carlos",
    apellido: "López",
    tipo: "persona",
    fechaNacimiento: "1988-07-22",
    nacionalidad: "ES",
    residencia: "Barcelona",
    documentos: [{ id: "d2", tipo: "pasaporte", nombre: "E87654321", fechaVencimiento: "2031-06-15" }],
    createdAt: new Date().toISOString(),
  },
];

export const VIAJE_EJEMPLO: Viaje = {
  id: "trip-ejemplo-001",
  destino: "Colombia",
  destinoId: "colombia",
  paisCodigo: "CO",
  tipo: "circuito",
  etapas: [
    { id: "e1", nombre: "Bogotá", paisCodigo: "CO", destinoId: "bogota", dias: 3 },
    { id: "e2", nombre: "Medellín", paisCodigo: "CO", destinoId: "medellin", dias: 4 },
    { id: "e3", nombre: "Cartagena", paisCodigo: "CO", destinoId: "cartagena", dias: 4 },
  ],
  viajerosIds: ["v1", "v2"],
  fechaSalida: "2024-09-20",
  fechaRegreso: "2024-10-04",
  modoPlanificacion: "completo",
  contexto: {
    numAdultos: 2,
    edadesMenores: [],
    mascota: false,
    presupuesto: { importe: 1500, tipo: "total", moneda: "EUR" },
    presupuestoTotal: 1500,
    duracionDias: 15,
  },
  transporte: [
    {
      id: "t1",
      modo: "avion",
      origen: "Madrid",
      destino: "Bogotá",
      horaSalida: "10:00",
      costeEstimado: 450,
      notas: "Iberia IB6234",
    },
    {
      id: "t2",
      modo: "autobus",
      origen: "Bogotá",
      destino: "Medellín",
      horaSalida: "14:00",
      costeEstimado: 30,
      notas: "Busco BUS-002456",
    },
    {
      id: "t3",
      modo: "avion",
      origen: "Cartagena",
      destino: "Madrid",
      horaSalida: "18:00",
      costeEstimado: 420,
      notas: "Iberia IB6245",
    },
  ],
  actividades: [
    { actividadId: "monserrate", estado: "planificada" },
    { actividadId: "coffee-tour", estado: "planificada" },
    { actividadId: "ciudad-amurallada", estado: "planificada" },
  ],
  alojamientoId: "hotel-cartagena-deluxe",
  documentos: [
    {
      id: "doc1",
      tipo: "alojamiento",
      proveedor: "Hotel Movich Cartagena",
      referencia: "RES-2024-09-001",
      notas: "Confirmación 15-20 sep",
    },
    {
      id: "doc2",
      tipo: "seguro",
      proveedor: "Seguros La Unión",
      referencia: "SEG-2024-09-500",
      notas: "Cobertura médica completa",
    },
  ],
  participantes: [],
  votaciones: [],
  recuerdos: [],
  itinerario: {
    version: 1,
    preferencias: {
      ritmo: "normal",
      permitirDescansos: true,
      permitirMadrugadas: false,
      horaLlegada: "09:00",
      horaSalida: "21:00",
    },
    dias: [
      {
        dia: 1,
        fecha: "2024-09-20",
        etapa: "Bogotá",
        descansoTotal: false,
        actividades: [
          {
            actividadId: "act-bog-1-1",
            horaInicio: "14:00",
            horaFin: "17:00",
            notas: "Llegada y acomodación",
            confirmada: true,
          },
          {
            actividadId: "act-bog-1-2",
            horaInicio: "18:00",
            horaFin: "20:00",
            notas: "Cena de bienvenida",
            confirmada: true,
          },
        ],
      },
      {
        dia: 2,
        fecha: "2024-09-21",
        etapa: "Bogotá",
        descansoTotal: false,
        actividades: [
          {
            actividadId: "act-bog-2-1",
            horaInicio: "09:00",
            horaFin: "12:00",
            notas: "Visita La Candelaria",
            confirmada: true,
          },
          {
            actividadId: "act-bog-2-2",
            horaInicio: "13:00",
            horaFin: "14:00",
            notas: "Almuerzo",
            confirmada: false,
          },
          {
            actividadId: "act-bog-2-3",
            horaInicio: "15:00",
            horaFin: "18:00",
            notas: "Museo del Oro",
            confirmada: true,
          },
        ],
      },
      {
        dia: 3,
        fecha: "2024-09-22",
        etapa: "Bogotá",
        descansoTotal: false,
        actividades: [
          {
            actividadId: "act-bog-3-1",
            horaInicio: "08:00",
            horaFin: "11:00",
            notas: "Visita Monserrate",
            confirmada: true,
          },
          {
            actividadId: "act-bog-3-2",
            horaInicio: "12:00",
            horaFin: "21:00",
            notas: "Tarde libre en el centro",
            confirmada: false,
          },
        ],
      },
      {
        dia: 4,
        fecha: "2024-09-23",
        etapa: "Medellín",
        descansoTotal: true,
        notas: "Viaje a Medellín, día de descanso",
        actividades: [],
      },
      {
        dia: 5,
        fecha: "2024-09-24",
        etapa: "Medellín",
        descansoTotal: false,
        actividades: [
          {
            actividadId: "act-med-1-1",
            horaInicio: "10:00",
            horaFin: "13:00",
            notas: "Tours Comuna 13",
            confirmada: true,
          },
          {
            actividadId: "act-med-1-2",
            horaInicio: "14:00",
            horaFin: "17:00",
            notas: "Paseo en cable",
            confirmada: false,
          },
          {
            actividadId: "act-med-1-3",
            horaInicio: "18:00",
            horaFin: "20:00",
            notas: "Cena tradicional",
            confirmada: true,
          },
        ],
      },
      {
        dia: 6,
        fecha: "2024-09-25",
        etapa: "Medellín",
        descansoTotal: false,
        actividades: [
          {
            actividadId: "act-med-2-1",
            horaInicio: "09:00",
            horaFin: "12:00",
            notas: "Feria de Flores (si aplicable)",
            confirmada: false,
          },
          {
            actividadId: "act-med-2-2",
            horaInicio: "14:00",
            horaFin: "19:00",
            notas: "Plaza Botero",
            confirmada: true,
          },
        ],
      },
      {
        dia: 7,
        fecha: "2024-09-26",
        etapa: "Medellín",
        descansoTotal: true,
        notas: "Viaje a Cartagena, descanso",
        actividades: [],
      },
      {
        dia: 8,
        fecha: "2024-09-27",
        etapa: "Cartagena",
        descansoTotal: false,
        actividades: [
          {
            actividadId: "act-car-1-1",
            horaInicio: "15:00",
            horaFin: "18:00",
            notas: "Llegada y paseo por la muralla",
            confirmada: true,
          },
          {
            actividadId: "act-car-1-2",
            horaInicio: "19:00",
            horaFin: "21:00",
            notas: "Cena frente al mar",
            confirmada: true,
          },
        ],
      },
      {
        dia: 9,
        fecha: "2024-09-28",
        etapa: "Cartagena",
        descansoTotal: false,
        actividades: [
          {
            actividadId: "act-car-2-1",
            horaInicio: "09:00",
            horaFin: "12:00",
            notas: "City tour Cartagena",
            confirmada: true,
          },
          {
            actividadId: "act-car-2-2",
            horaInicio: "13:00",
            horaFin: "17:00",
            notas: "Islas del Rosario",
            confirmada: true,
          },
        ],
      },
      {
        dia: 10,
        fecha: "2024-09-29",
        etapa: "Cartagena",
        descansoTotal: false,
        actividades: [
          {
            actividadId: "act-car-3-1",
            horaInicio: "10:00",
            horaFin: "13:00",
            notas: "Playa libre",
            confirmada: false,
          },
          {
            actividadId: "act-car-3-2",
            horaInicio: "15:00",
            horaFin: "21:00",
            notas: "Shopping y compras de souvenirs",
            confirmada: false,
          },
        ],
      },
      {
        dia: 11,
        fecha: "2024-09-30",
        etapa: "Cartagena",
        descansoTotal: true,
        notas: "Último día libre antes de volver",
        actividades: [],
      },
      {
        dia: 12,
        fecha: "2024-10-01",
        etapa: "Cartagena",
        descansoTotal: false,
        actividades: [
          {
            actividadId: "act-car-4-1",
            horaInicio: "16:00",
            horaFin: "18:00",
            notas: "Ida al aeropuerto",
            confirmada: true,
          },
        ],
      },
    ],
  },
  investigacion: {
    generadoEn: new Date().toISOString(),
    sitios: {
      "Bogotá": [
        {
          nombre: "La Candelaria",
          categoria: "cultura",
          detalle: "Barrio histórico colonial",
          lat: 4.5981,
          lon: -74.0758,
        },
        {
          nombre: "Monserrate",
          categoria: "naturaleza",
          detalle: "Santuario a 3152m de altura",
          lat: 4.6097,
          lon: -74.0721,
        },
      ],
      "Medellín": [
        {
          nombre: "Comuna 13",
          categoria: "cultura",
          detalle: "Barrio con arte callejero",
          lat: 6.248,
          lon: -75.545,
        },
      ],
    },
    clima: [
      {
        lugar: "Bogotá",
        actualC: 14,
        dias: [
          { fecha: "2024-09-21", minC: 10, maxC: 15, probabilidadLluvia: 80 },
          { fecha: "2024-09-22", minC: 10, maxC: 14, probabilidadLluvia: 60 },
          { fecha: "2024-09-23", minC: 11, maxC: 16, probabilidadLluvia: 30 },
        ],
      },
      {
        lugar: "Medellín",
        actualC: 24,
        dias: [
          { fecha: "2024-09-24", minC: 18, maxC: 26, probabilidadLluvia: 40 },
          { fecha: "2024-09-25", minC: 19, maxC: 27, probabilidadLluvia: 20 },
          { fecha: "2024-09-26", minC: 18, maxC: 25, probabilidadLluvia: 70 },
        ],
      },
    ],
    moneda: {
      base: "EUR",
      fecha: new Date().toISOString().split("T")[0],
      tasas: { COP: 4200, USD: 1.08 },
    },
    auditoria: {
      operativas: ["openstreetmap", "openmeteo"],
      parciales: ["nominatim"],
      bloqueadas: [],
      fallidas: [],
      noEjercidas: [],
    },
    fuentes: ["OpenStreetMap", "Open-Meteo", "Nominatim"],
  },
  createdAt: new Date().toISOString(),
};

export function cargarEjemploBase() {
  if (typeof window === "undefined") return;

  const CLAVE_VIAJEROS = "efecto-viajero:viajeros";
  const CLAVE_VIAJES = "efecto-viajero:viajes";

  try {
    const viajerosSaved = localStorage.getItem(CLAVE_VIAJEROS);
    const viajesSaved = localStorage.getItem(CLAVE_VIAJES);

    if (!viajerosSaved) {
      localStorage.setItem(CLAVE_VIAJEROS, JSON.stringify(VIAJEROS_EJEMPLO));
    }

    if (!viajesSaved) {
      localStorage.setItem(CLAVE_VIAJES, JSON.stringify([VIAJE_EJEMPLO]));
    }
  } catch (err) {
    console.warn("No se pudo cargar el ejemplo base:", err);
  }
}

export function limpiarEjemploBase() {
  if (typeof window === "undefined") return;

  const CLAVE_VIAJEROS = "efecto-viajero:viajeros";
  const CLAVE_VIAJES = "efecto-viajero:viajes";

  try {
    localStorage.removeItem(CLAVE_VIAJEROS);
    localStorage.removeItem(CLAVE_VIAJES);
    localStorage.removeItem("efecto-viajero:sync-meta");
  } catch (err) {
    console.warn("No se pudo limpiar el ejemplo base:", err);
  }
}
