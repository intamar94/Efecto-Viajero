"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { interpretarTexto, type NecesidadesViaje } from "@/lib/explorador";
import { detectarLugaresEnTexto, resolverLugar } from "@/lib/lugares";
import type { Etapa, TipoViaje } from "@/lib/types";

const EJEMPLOS = [
  "Quiero viajar 7 días con mi hija y nuestro perro. Naturaleza, pueblos bonitos y comer bien, sin conducir mucho.",
  "Dos semanas por Colombia: Salento, Medellín y Cartagena, comida local y cultura.",
  "Unos días en Japón, con trenes, mercados, templos y un ritmo tranquilo.",
];

const DOMINIOS = [
  ["Destino", "🌍", "Encontrar y validar los lugares del viaje"],
  ["Viajeros", "👥", "Adaptar el viaje a las personas y necesidades"],
  ["Transporte", "🚆", "Conectar origen, destinos y desplazamientos"],
  ["Alojamiento", "🏠", "Buscar opciones compatibles con el contexto"],
  ["Experiencias", "✨", "Naturaleza, cultura, comida y actividades"],
  ["Requisitos", "📋", "Reglas, fronteras, documentos y restricciones"],
  ["Clima", "☁️", "Considerar condiciones durante el viaje"],
  ["Presupuesto", "€", "Mantener el viaje dentro de las condiciones indicadas"],
  ["Mapa", "🗺️", "Convertir la información en una ruta utilizable"],
  ["Recuerdos", "📸", "Preparar la memoria del viaje desde el principio"],
] as const;

interface BorradorEtapa extends Etapa { necesitaPais: boolean; }

function crearEtapa(nombre: string): BorradorEtapa {
  const lugar = resolverLugar(nombre);
  return { id: generarId(), nombre: lugar?.nombre ?? nombre, paisCodigo: lugar?.paisCodigo, destinoId: lugar?.destinoId, necesitaPais: !lugar?.paisCodigo };
}

function resumen(necesidades: NecesidadesViaje | null) {
  if (!necesidades) return [];
  const result: string[] = [];
  if (necesidades.numAdultos) result.push(`${necesidades.numAdultos} adultos`);
  necesidades.edadesMenores.forEach((edad) => result.push(`menor de ${edad} años`));
  if (necesidades.mascota) result.push("🐾 mascota");
  if (necesidades.presupuestoMax) result.push(`hasta ${necesidades.presupuestoMax} €`);
  if (necesidades.duracionDias) result.push(`${necesidades.duracionDias} días`);
  if (necesidades.ciudadOrigen) result.push(`desde ${necesidades.ciudadOrigen}`);
  if (necesidades.ritmo) result.push(`ritmo ${necesidades.ritmo}`);
  if (necesidades.sinConducirMucho) result.push("sin conducir mucho");
  return [...result, ...necesidades.intereses];
}

export default function PlanificarPage() {
  const router = useRouter();
  const { crearViaje } = useData();
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<TipoViaje>("simple");
  const [analizando, setAnalizando] = useState(false);
  const [analizado, setAnalizado] = useState(false);
  const [necesidades, setNecesidades] = useState<NecesidadesViaje | null>(null);
  const [etapas, setEtapas] = useState<BorradorEtapa[]>([]);
  const [nuevaParada, setNuevaParada] = useState("");
  const esCircuito = tipo === "circuito";
  const etiquetas = useMemo(() => resumen(necesidades), [necesidades]);

  function analizar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setAnalizando(true);
    window.setTimeout(() => {
      const n = interpretarTexto(texto);
      const detectados = detectarLugaresEnTexto(texto);
      setNecesidades(n);
      setEtapas((esCircuito ? detectados : detectados.slice(0, 1)).map((l) => ({ id: generarId(), nombre: l.nombre, paisCodigo: l.paisCodigo, destinoId: l.destinoId, necesitaPais: !l.paisCodigo })));
      setAnalizando(false);
      setAnalizado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 350);
  }

  function crear() {
    if (!necesidades || etapas.length === 0) return;
    const limpias: Etapa[] = etapas.map(({ id, nombre, paisCodigo, destinoId }) => ({ id, nombre: nombre.trim(), paisCodigo, destinoId }));
    const principal = limpias[0];
    const nuevo = crearViaje({
      destino: esCircuito && limpias.length > 1 ? `${limpias[0].nombre} → ${limpias[limpias.length - 1].nombre}` : principal.nombre,
      destinoId: principal.destinoId,
      paisCodigo: principal.paisCodigo,
      tipo,
      etapas: limpias,
      viajerosIds: [],
      contexto: {
        presupuestoTotal: necesidades.presupuestoMax,
        duracionDias: necesidades.duracionDias,
        numAdultos: necesidades.numAdultos,
        edadesMenores: necesidades.edadesMenores.length ? necesidades.edadesMenores : undefined,
        mascota: necesidades.mascota || undefined,
        ciudadOrigen: necesidades.ciudadOrigen || undefined,
      },
    });
    router.push(`/viajes/${nuevo.id}`);
  }

  function agregarParada() {
    const nombre = nuevaParada.trim();
    if (!nombre) return;
    setEtapas((prev) => [...prev, crearEtapa(nombre)]);
    setNuevaParada("");
  }

  if (analizado) return (
    <main className="flex-1 px-5 py-7">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => setAnalizado(false)} className="text-sm text-neutral-500 hover:text-neutral-900">← Cambiar descripción</button>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Travel Brain activo</span>
        </div>
        <section className="mb-5 rounded-3xl bg-marino-900 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Hemos deconstruido tu viaje</p>
          <h1 className="mt-2 text-2xl font-semibold">Ahora hacemos que todo encaje.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Lo que escribiste se convierte en contexto compartido. Las distintas inteligencias trabajan sobre el mismo viaje y ninguna parte de tu petición se descarta.</p>
          {etiquetas.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{etiquetas.map((item) => <span key={item} className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/90">{item}</span>)}</div>}
        </section>
        <section className="card mb-5">
          <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-coral-600">Sistema de investigación</p><h2 className="mt-1 text-lg font-semibold text-neutral-900">Todo lo que vamos a comprobar</h2></div><span className="text-xs text-neutral-400">10 áreas iniciales</span></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DOMINIOS.map(([nombre, icono, descripcion]) => <div key={nombre} className="flex gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-3"><span className="text-lg">{icono}</span><div><p className="text-sm font-medium text-neutral-900">{nombre}</p><p className="mt-0.5 text-xs leading-5 text-neutral-500">{descripcion}</p></div><span className="ml-auto mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Preparado" /></div>)}
          </div>
        </section>
        <section className="card mb-5">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-neutral-900">{esCircuito ? "Tu recorrido" : "Tu destino"}</h2><p className="text-xs text-neutral-500">Puedes corregir lo que hemos entendido antes de crear el viaje.</p></div><button type="button" onClick={() => setTipo(esCircuito ? "simple" : "circuito")} className="text-xs font-medium text-coral-600">{esCircuito ? "Un destino" : "Varios destinos"}</button></div>
          <div className="space-y-2">
            {etapas.map((etapa, index) => <div key={etapa.id} className="flex items-center gap-2 rounded-2xl border border-neutral-200 p-3">{esCircuito && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marino-50 text-xs font-semibold text-marino-700">{index + 1}</span>}<input className="input flex-1" value={etapa.nombre} onChange={(e) => setEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...crearEtapa(e.target.value), id: x.id } : x))} />{esCircuito && <button type="button" onClick={() => setEtapas((prev) => prev.filter((x) => x.id !== etapa.id))} className="px-2 text-neutral-400 hover:text-red-600" aria-label="Eliminar parada">×</button>}</div>)}
            {etapas.length === 0 && <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">No reconocimos un destino. Añádelo manualmente para continuar.</p>}
          </div>
          {esCircuito && <div className="mt-3 flex gap-2"><input className="input flex-1" value={nuevaParada} onChange={(e) => setNuevaParada(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarParada())} placeholder="Añadir ciudad, pueblo o país" /><button type="button" onClick={agregarParada} className="btn-secondary">Añadir</button></div>}
        </section>
        <button disabled={etapas.length === 0} onClick={crear} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">Crear mi viaje y empezar a investigar →</button>
      </div>
    </main>
  );

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Efecto Viajero</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Cuéntanos qué viaje tienes en mente.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">No necesitas saber todavía cómo organizarlo. Escribe lo que quieres, con quién vas, lo que te gusta y lo que quieres evitar. Nosotros deconstruimos el viaje.</p></div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTipo("simple")} className={`rounded-2xl border p-4 text-left ${tipo === "simple" ? "border-coral-300 bg-coral-50" : "border-neutral-200 bg-white"}`}><span className="text-xl">📍</span><span className="mt-2 block text-sm font-semibold">Un destino</span><span className="mt-1 block text-xs text-neutral-500">Una base para explorar.</span></button>
          <button type="button" onClick={() => setTipo("circuito")} className={`rounded-2xl border p-4 text-left ${tipo === "circuito" ? "border-coral-300 bg-coral-50" : "border-neutral-200 bg-white"}`}><span className="text-xl">🧭</span><span className="mt-2 block text-sm font-semibold">Varios destinos</span><span className="mt-1 block text-xs text-neutral-500">Una ruta con varias paradas.</span></button>
        </div>
        <form onSubmit={analizar} className="card">
          <label className="mb-2 block text-sm font-medium text-neutral-800">¿Qué quieres hacer?</label>
          <textarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} className="input min-h-44 resize-y text-base leading-6" placeholder="Ej. Quiero viajar 7 días con mi hija y nuestro perro. Nos gusta la naturaleza, los pueblos bonitos y comer bien. Tenemos unos 1.500 € y preferimos no conducir demasiado." />
          <div className="mt-3 flex flex-wrap gap-2">{EJEMPLOS.map((ejemplo) => <button key={ejemplo} type="button" onClick={() => setTexto(ejemplo)} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-left text-xs text-neutral-500 hover:border-coral-300 hover:text-neutral-900">{ejemplo.length > 58 ? `${ejemplo.slice(0, 58)}…` : ejemplo}</button>)}</div>
          <button disabled={!texto.trim() || analizando} className="btn-primary mt-4 w-full disabled:opacity-50">{analizando ? "Deconstruyendo tu viaje…" : "Analizar mi viaje →"}</button>
        </form>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{[["🧠", "Entender", "Interpretamos intención, contexto y restricciones."], ["🔀", "Delegar", "Cada necesidad pasa a la inteligencia adecuada."], ["🧩", "Encajar", "Todo vuelve al mismo contexto de viaje."]].map(([icono, titulo, descripcion]) => <div key={titulo} className="rounded-2xl border border-neutral-100 bg-white p-4"><span className="text-lg">{icono}</span><p className="mt-2 text-sm font-semibold text-neutral-900">{titulo}</p><p className="mt-1 text-xs leading-5 text-neutral-500">{descripcion}</p></div>)}</div>
      </div>
    </main>
  );
}
