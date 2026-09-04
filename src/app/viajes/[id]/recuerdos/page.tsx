"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { fechaDeImagen, miniaturaDeImagen } from "@/lib/fotos";
import { classifyMedia, buildMemoryStoryboard } from "@/lib/media/intelligence";
import type { EVMediaAsset, MediaCategory } from "@/lib/media/types";
import type { Recuerdo } from "@/lib/types";

const categorias: Array<{ id: MediaCategory; label: string; icon: string }> = [
  { id: "food", label: "Comida", icon: "🍜" },
  { id: "sunset", label: "Atardeceres", icon: "🌅" },
  { id: "nature", label: "Naturaleza", icon: "🏞️" },
  { id: "landmark", label: "Lugares", icon: "🏛️" },
  { id: "family", label: "Familia", icon: "❤️" },
  { id: "activity", label: "Actividades", icon: "🥾" },
];

function guessCategories(name: string): MediaCategory[] {
  const text = name.toLowerCase();
  const rules: Array<[MediaCategory, string[]]> = [
    ["food", ["food", "comida", "restaurant", "restaurante", "cena", "almuerzo"]],
    ["sunset", ["sunset", "atardecer", "amanecer", "sunrise"]],
    ["nature", ["beach", "playa", "mountain", "montaña", "lake", "lago", "nature", "naturaleza"]],
    ["landmark", ["museum", "museo", "palace", "palacio", "monument", "monumento"]],
    ["family", ["family", "familia", "hija", "hijo"]],
    ["activity", ["hike", "senderismo", "tour", "excursion", "excursión"]],
  ];
  const found = rules.filter(([, terms]) => terms.some((term) => text.includes(term))).map(([category]) => category);
  return found.length ? found : ["unknown"];
}

export default function RecuerdosPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);
  const [pendientes, setPendientes] = useState<Array<{ recuerdo: Recuerdo; asset: EVMediaAsset }>>([]);
  const [procesandoFotos, setProcesandoFotos] = useState(false);
  const [errorFotos, setErrorFotos] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<MediaCategory | null>(null);
  const [duracionVideo, setDuracionVideo] = useState<15 | 30 | 60>(30);
  const [estiloVideo, setEstiloVideo] = useState<"calm" | "dynamic" | "emotional" | "fun" | "cinematic">("cinematic");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoCanvas = useRef<HTMLCanvasElement | null>(null);

  const recuerdos = useMemo(() => {
    if (!viaje) return [];
    return [...viaje.recuerdos].sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
  }, [viaje]);

  if (!viaje) return <main className="flex-1 px-5 py-8"><div className="mx-auto max-w-xl"><Cabecera titulo="Viaje no encontrado" volverA="/viajes" /></div></main>;

  function guardarRecuerdo(recuerdo: Recuerdo) {
    actualizarViaje(viaje!.id, {
      recuerdos: [...viaje!.recuerdos, { ...recuerdo, seleccionadoPorUsuario: true }],
    });
    setPendientes((prev) => prev.filter((item) => item.recuerdo.id !== recuerdo.id));
  }

  function descartarRecuerdo(id: string) {
    setPendientes((prev) => prev.filter((item) => item.recuerdo.id !== id));
  }

  async function importarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!archivos.length) return;
    setProcesandoFotos(true);
    setErrorFotos(null);
    try {
      const nuevos = await Promise.all(archivos.map(async (archivo) => {
        const [miniatura, fecha] = await Promise.all([miniaturaDeImagen(archivo), fechaDeImagen(archivo)]);
        const categories = guessCategories(archivo.name);
        const asset = classifyMedia({
          id: generarId(), provider: "device", type: "photo", name: archivo.name,
          createdAt: fecha, tripId: viaje!.id, categories, selectedAsMemory: false,
        });
        const recuerdo: Recuerdo = {
          id: asset.id,
          titulo: archivo.name.replace(/\.[^.]+$/, ""),
          fecha,
          fotoDataUrl: miniatura,
          proveedorMedia: "device",
          referenciaMedia: asset.id,
          categorias: categories,
          analizado: true,
          seleccionadoPorUsuario: false,
        };
        return { recuerdo, asset };
      }));
      setPendientes((prev) => [...prev, ...nuevos]);
    } catch {
      setErrorFotos("No hemos podido procesar alguna de las fotos. Puedes probar con otra o añadir el momento a mano.");
    } finally {
      setProcesandoFotos(false);
    }
  }

  async function crearVideo() {
    const assets: EVMediaAsset[] = recuerdos
      .filter((r) => r.fotoDataUrl)
      .map((r) => ({ id: r.id, provider: r.proveedorMedia ?? "device", providerAssetId: r.referenciaMedia, type: "photo", name: r.titulo, createdAt: r.fecha, tripId: viaje!.id, categories: (r.categorias ?? ["unknown"]) as MediaCategory[], selectedAsMemory: true, thumbnailUrl: r.fotoDataUrl }));
    const storyboard = buildMemoryStoryboard({ tripId: viaje.id, durationSeconds: duracionVideo, style: estiloVideo }, assets);
    if (!storyboard.scenes.length) return;
    const canvas = videoCanvas.current;
    if (!canvas || typeof MediaRecorder === "undefined") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 720; canvas.height = 720;
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => { if (videoUrl) URL.revokeObjectURL(videoUrl); setVideoUrl(URL.createObjectURL(new Blob(chunks, { type: "video/webm" }))); };
    recorder.start();
    for (const scene of storyboard.scenes) {
      const asset = assets.find((item) => item.id === scene.assetId);
      if (!asset?.thumbnailUrl) continue;
      await new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
          const w = image.width * scale; const h = image.height * scale;
          ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
          if (scene.caption) { ctx.font = "28px sans-serif"; ctx.fillText(scene.caption, 28, canvas.height - 36); }
          setTimeout(resolve, scene.seconds * 1000);
        };
        image.src = asset.thumbnailUrl!;
      });
    }
    recorder.stop();
  }

  const visibles = filtro ? recuerdos.filter((r) => r.categorias?.includes(filtro)) : recuerdos;

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Recuerdos" subtitulo="Efecto Viajero entiende tus momentos y los convierte en recuerdos del viaje." volverA={`/viajes/${viaje.id}`} />
        <ViajeToolsNav viajeId={viaje.id} />

        <section className="card mb-5">
          <p className="text-sm font-semibold text-neutral-900">Tu contenido puede quedarse donde ya está</p>
          <p className="mt-1 text-sm text-neutral-500">La arquitectura usa referencias a la nube del viajero en lugar de crear otra biblioteca de fotos. Las conexiones de Google Photos, iCloud, OneDrive y Dropbox se incorporarán mediante conectores con permisos explícitos.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["☁️", "Conectar una nube", "No copiaremos tu biblioteca"],
              ["📱", "Usar este teléfono", "Solo lo que tú selecciones"],
            ].map(([icon, title, desc]) => <button key={title} type="button" className="rounded-xl border border-neutral-200 p-3 text-left hover:border-coral-300"><span className="text-lg">{icon}</span><span className="mt-1 block text-sm font-medium">{title}</span><span className="block text-xs text-neutral-400">{desc}</span></button>)}
          </div>
        </section>

        <section className="card mb-5">
          <label className="block"><span className="mb-2 block text-sm font-medium text-neutral-700">Añadir fotos o vídeos</span><input type="file" accept="image/*,video/*" multiple onChange={importarFotos} disabled={procesandoFotos} className="input" /></label>
          <p className="mt-2 text-xs text-neutral-400">Primero se prepara una miniatura local y se propone si quieres conservarla como recuerdo. La clasificación visual profunda queda preparada para el Memory Agent.</p>
          {procesandoFotos && <p className="mt-2 text-sm text-neutral-500">Analizando momentos…</p>}
          {errorFotos && <p className="mt-2 text-sm text-amber-600">{errorFotos}</p>}
        </section>

        {pendientes.length > 0 && <section className="mb-6 space-y-3"><h2 className="text-sm font-semibold">¿Quieres guardar estos momentos?</h2>{pendientes.map(({ recuerdo }) => <div key={recuerdo.id} className="card flex items-center gap-3">{recuerdo.fotoDataUrl && <img src={recuerdo.fotoDataUrl} alt={recuerdo.titulo} className="h-16 w-16 rounded-lg object-cover" />}<div className="min-w-0 flex-1"><p className="font-medium truncate">{recuerdo.titulo}</p><p className="text-xs text-neutral-400">{recuerdo.categorias?.map((c) => categorias.find((x) => x.id === c)?.label ?? c).join(" · ")}</p></div><button type="button" onClick={() => guardarRecuerdo(recuerdo)} className="btn-primary px-3 py-2 text-sm">Guardar</button><button type="button" onClick={() => descartarRecuerdo(recuerdo.id)} className="text-sm text-neutral-400">No</button></div>)}</section>}

        <section className="mb-5"><div className="flex flex-wrap gap-2">{categorias.map((c) => <button key={c.id} type="button" onClick={() => setFiltro(filtro === c.id ? null : c.id)} className={`rounded-full border px-3 py-1.5 text-xs ${filtro === c.id ? "border-coral-400 bg-coral-50" : "border-neutral-200 bg-white"}`}>{c.icon} {c.label}</button>)}</div></section>

        {visibles.length === 0 ? <p className="mb-6 text-sm text-neutral-500">Todavía no hay momentos guardados.</p> : <ol className="mb-6 space-y-3 border-l border-neutral-200 pl-4">{visibles.map((r) => <li key={r.id} className="relative"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-marino-600" /><div className="flex items-start gap-3">{r.fotoDataUrl && <img src={r.fotoDataUrl} alt={r.titulo} className="h-16 w-16 shrink-0 rounded-lg object-cover" />}<div className="flex-1"><p className="font-medium">{r.titulo}</p>{r.fecha && <p className="text-xs text-neutral-400">{r.fecha}</p>}<p className="mt-1 text-xs text-neutral-500">{r.categorias?.map((c) => categorias.find((x) => x.id === c)?.label ?? c).join(" · ")}</p>{r.nota && <p className="mt-1 text-sm text-neutral-600">{r.nota}</p>}</div><button type="button" onClick={() => actualizarViaje(viaje.id, { recuerdos: viaje.recuerdos.filter((item) => item.id !== r.id) })} className="text-sm text-neutral-400 hover:text-red-600">Eliminar</button></div></li>)}</ol>}

        {recuerdos.some((r) => r.fotoDataUrl) && <section className="card mb-6"><h2 className="font-semibold">Crear un vídeo corto</h2><p className="mt-1 text-sm text-neutral-500">Selecciona el tipo de recuerdo y Efecto Viajero compone una pieza básica sin obligarte a editarla.</p><div className="mt-3 grid grid-cols-2 gap-2"><select className="input" value={duracionVideo} onChange={(e) => setDuracionVideo(Number(e.target.value) as 15 | 30 | 60)}><option value={15}>15 segundos</option><option value={30}>30 segundos</option><option value={60}>60 segundos</option></select><select className="input" value={estiloVideo} onChange={(e) => setEstiloVideo(e.target.value as typeof estiloVideo)}><option value="cinematic">Cinemático</option><option value="calm">Tranquilo</option><option value="dynamic">Dinámico</option><option value="emotional">Emotivo</option><option value="fun">Divertido</option></select></div><button type="button" onClick={crearVideo} className="btn-primary mt-3 w-full">🎬 Crear vídeo</button>{videoUrl && <a className="mt-3 block text-center text-sm font-medium text-marino-700 underline" href={videoUrl} download={`efecto-viajero-${viaje.id}.webm`}>Ver / guardar vídeo generado</a>}<canvas ref={videoCanvas} className="hidden" /></section>}

        <form onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); const titulo = String(form.get("titulo") ?? "").trim(); if (!titulo) return; actualizarViaje(viaje.id, { recuerdos: [...viaje.recuerdos, { id: generarId(), titulo, fecha: String(form.get("fecha") ?? "") || undefined, nota: String(form.get("nota") ?? "") || undefined, seleccionadoPorUsuario: true }] }); e.currentTarget.reset(); }} className="card space-y-3"><p className="text-sm font-medium text-neutral-700">O añade un momento sin foto</p><input name="titulo" className="input" placeholder="¿Qué pasó?" /><input name="fecha" type="date" className="input" /><textarea name="nota" className="input min-h-20" placeholder="Nota (opcional)" /><button type="submit" className="btn-primary w-full">+ Guardar momento</button></form>
      </div>
    </main>
  );
}
