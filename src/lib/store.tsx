"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { generarId } from "./id";
import type { Documento, MascotaViajero, PersonaViajero, Viaje, Viajero } from "./types";

const CLAVE_VIAJEROS = "efecto-viajero:viajeros";
const CLAVE_VIAJES = "efecto-viajero:viajes";

function leerDeStorage<T>(clave: string, valorInicial: T): T {
  if (typeof window === "undefined") return valorInicial;
  try {
    const bruto = window.localStorage.getItem(clave);
    return bruto ? (JSON.parse(bruto) as T) : valorInicial;
  } catch {
    return valorInicial;
  }
}

function escribirEnStorage<T>(clave: string, valor: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(clave, JSON.stringify(valor));
}

const MENSAJE_ERROR_GUARDADO =
  "No se ha podido guardar el último cambio: el almacenamiento del navegador está lleno. Borra fotos antiguas en Recuerdos o libera espacio en el dispositivo.";

interface DataContextValue {
  hidratado: boolean;
  errorGuardado: string | null;
  viajeros: Viajero[];
  viajes: Viaje[];
  crearPersona: (datos: Omit<PersonaViajero, "id" | "tipo" | "documentos" | "createdAt"> & { documentos?: Documento[] }) => PersonaViajero;
  crearMascota: (datos: Omit<MascotaViajero, "id" | "tipo" | "documentos" | "createdAt"> & { documentos?: Documento[] }) => MascotaViajero;
  actualizarViajero: (id: string, cambios: Partial<Viajero>) => void;
  eliminarViajero: (id: string) => void;
  obtenerViajero: (id: string) => Viajero | undefined;
  crearViaje: (
    datos: Omit<
      Viaje,
      "id" | "createdAt" | "transporte" | "actividades" | "documentos" | "souvenirs" | "participantes" | "votaciones" | "recuerdos"
    >
  ) => Viaje;
  actualizarViaje: (id: string, cambios: Partial<Viaje>) => void;
  eliminarViaje: (id: string) => void;
  obtenerViaje: (id: string) => Viaje | undefined;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [hidratado, setHidratado] = useState(false);
  const [viajeros, setViajeros] = useState<Viajero[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  useEffect(() => {
    // Se lee localStorage tras montar (no en el render) para que el HTML
    // del servidor y el primer render del cliente coincidan y no haya
    // desajuste de hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViajeros(leerDeStorage(CLAVE_VIAJEROS, []));
    setViajes(leerDeStorage(CLAVE_VIAJES, []));
    setHidratado(true);
  }, []);

  // localStorage.setItem puede lanzar (cuota llena — las fotos de Recuerdos
  // son lo más probable que la agote). Sin este try/catch el cambio se
  // pierde en silencio: el usuario ve que "no se guarda" sin ningún aviso.
  useEffect(() => {
    if (!hidratado) return;
    try {
      escribirEnStorage(CLAVE_VIAJEROS, viajeros);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorGuardado(null);
    } catch {
      setErrorGuardado(MENSAJE_ERROR_GUARDADO);
    }
  }, [viajeros, hidratado]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      escribirEnStorage(CLAVE_VIAJES, viajes);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorGuardado(null);
    } catch {
      setErrorGuardado(MENSAJE_ERROR_GUARDADO);
    }
  }, [viajes, hidratado]);

  const crearPersona = useCallback<DataContextValue["crearPersona"]>((datos) => {
    const nueva: PersonaViajero = {
      ...datos,
      id: generarId(),
      tipo: "persona",
      documentos: datos.documentos ?? [],
      createdAt: new Date().toISOString(),
    };
    setViajeros((prev) => [...prev, nueva]);
    return nueva;
  }, []);

  const crearMascota = useCallback<DataContextValue["crearMascota"]>((datos) => {
    const nueva: MascotaViajero = {
      ...datos,
      id: generarId(),
      tipo: "mascota",
      documentos: datos.documentos ?? [],
      createdAt: new Date().toISOString(),
    };
    setViajeros((prev) => [...prev, nueva]);
    return nueva;
  }, []);

  const actualizarViajero = useCallback<DataContextValue["actualizarViajero"]>((id, cambios) => {
    setViajeros((prev) =>
      prev.map((v) => (v.id === id ? ({ ...v, ...cambios } as Viajero) : v))
    );
  }, []);

  const eliminarViajero = useCallback<DataContextValue["eliminarViajero"]>((id) => {
    setViajeros((prev) => prev.filter((v) => v.id !== id));
    setViajes((prev) => prev.map((viaje) => ({
      ...viaje,
      viajerosIds: viaje.viajerosIds.filter((vid) => vid !== id),
    })));
  }, []);

  const obtenerViajero = useCallback<DataContextValue["obtenerViajero"]>(
    (id) => viajeros.find((v) => v.id === id),
    [viajeros]
  );

  const crearViaje = useCallback<DataContextValue["crearViaje"]>((datos) => {
    const nuevo: Viaje = {
      ...datos,
      id: generarId(),
      createdAt: new Date().toISOString(),
      transporte: [],
      actividades: [],
      documentos: [],
      souvenirs: [],
      participantes: [],
      votaciones: [],
      recuerdos: [],
    };
    setViajes((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  const actualizarViaje = useCallback<DataContextValue["actualizarViaje"]>((id, cambios) => {
    setViajes((prev) => prev.map((v) => (v.id === id ? { ...v, ...cambios } : v)));
  }, []);

  const eliminarViaje = useCallback<DataContextValue["eliminarViaje"]>((id) => {
    setViajes((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const obtenerViaje = useCallback<DataContextValue["obtenerViaje"]>(
    (id) => viajes.find((v) => v.id === id),
    [viajes]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      hidratado,
      errorGuardado,
      viajeros,
      viajes,
      crearPersona,
      crearMascota,
      actualizarViajero,
      eliminarViajero,
      obtenerViajero,
      crearViaje,
      actualizarViaje,
      eliminarViaje,
      obtenerViaje,
    }),
    [
      hidratado,
      errorGuardado,
      viajeros,
      viajes,
      crearPersona,
      crearMascota,
      actualizarViajero,
      eliminarViajero,
      obtenerViajero,
      crearViaje,
      actualizarViaje,
      eliminarViaje,
      obtenerViaje,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData debe usarse dentro de <DataProvider>");
  return ctx;
}
