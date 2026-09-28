"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { coordsDeImagen, fechaDeImagen, miniaturaDeImagen } from "@/lib/fotos";
import { claveDeCoordenadas, lugarDeCoordenadas } from "@/lib/geocodificacionInversa";
import { formatearFecha } from "@/lib/formatoFecha";

const NATIVO = Capacitor.isNativePlatform();

export default function RecuerdosPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [nota, setNota] = useState("");
  const [procesandoFotos, setProcesandoFotos] = useState(false);
  const [errorFotos, setErrorFotos] = useState<string | null>(null);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Trip not found" volverA="/viajes" />
        </div>
      </main>
    );
  }

  function importarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    procesarArchivos(archivos);
  }

  // En la app instalada (Android) se usa el selector nativo de galería —
  // el mismo picker que usa cualquier app con acceso real a fotos, no la
  // ventanita limitada del navegador — y de ahí se pasan los archivos
  // reales al mismo pipeline de siempre (EXIF, lugar, miniatura): una
  // sola lógica para web y para la app instalada, no dos caminos que
  // puedan desalinearse.
  async function elegirDeGaleriaNativa() {
    if (!viaje) return;
    try {
      const { results } = await Camera.chooseFromGallery({ allowMultipleSelection: true, quality: 80 });
      const archivos = await Promise.all(
        results
          .filter((r) => r.webPath)
          .map(async (r, i) => {
            const blob = await (await fetch(r.webPath as string)).blob();
            return new File([blob], `foto-${Date.now()}-${i}.jpg`, { type: blob.type || "image/jpeg" });
          })
      );
      procesarArchivos(archivos);
    } catch {
      // El usuario canceló el selector, o el permiso fue denegado: no es
      // un error que haya que mostrar como fallo de la app.
    }
  }

  async function procesarArchivos(archivos: File[]) {
    if (archivos.length === 0 || !viaje) return;

    setProcesandoFotos(true);
    setErrorFotos(null);
    try {
      const conCoords = await Promise.all(
        archivos.map(async (archivo) => {
          const [fotoDataUrl, fechaFoto, coords] = await Promise.all([miniaturaDeImagen(archivo), fechaDeImagen(archivo), coordsDeImagen(archivo)]);
          return { archivo, fotoDataUrl, fechaFoto, coords };
        })
      );

      // Varias fotos del mismo sitio comparten una sola consulta real de
      // geocodificación inversa, en vez de repetirla foto por foto.
      const lugaresPorClave = new Map<string, string | undefined>();
      for (const { coords } of conCoords) {
        if (!coords) continue;
        const clave = claveDeCoordenadas(coords.lat, coords.lon);
        if (lugaresPorClave.has(clave)) continue;
        const lugar = await lugarDeCoordenadas(coords.lat, coords.lon);
        lugaresPorClave.set(clave, lugar?.nombre);
      }

      const nuevos = conCoords.map(({ archivo, fotoDataUrl, fechaFoto, coords }) => ({
        id: generarId(),
        titulo: archivo.name.replace(/\.[^.]+$/, ""),
        fecha: fechaFoto,
        fotoDataUrl,
        lat: coords?.lat,
        lon: coords?.lon,
        lugar: coords ? lugaresPorClave.get(claveDeCoordenadas(coords.lat, coords.lon)) : undefined,
      }));
      actualizarViaje(viaje.id, { recuerdos: [...viaje.recuerdos, ...nuevos] });
    } catch {
      setErrorFotos("We couldn't process one of the photos. Try another or add the moment by hand.");
    } finally {
      setProcesandoFotos(false);
    }
  }

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!viaje || !titulo.trim()) return;
    actualizarViaje(viaje.id, {
      recuerdos: [...viaje.recuerdos, { id: generarId(), titulo: titulo.trim(), fecha: fecha || undefined, nota: nota.trim() || undefined }],
    });
    setTitulo("");
    setFecha("");
    setNota("");
  }

  function eliminar(id: string) {
    if (!viaje) return;
    actualizarViaje(viaje.id, { recuerdos: viaje.recuerdos.filter((r) => r.id !== id) });
  }

  const ordenados = [...viaje.recuerdos].sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));

  // Cronológico de verdad: agrupado por día, no solo una lista larga
  // ordenada por fecha — así se ve el viaje como una línea de tiempo real.
  const grupos: { fecha: string; recuerdos: typeof ordenados }[] = [];
  for (const r of ordenados) {
    const clave = r.fecha ?? "Sin fecha";
    const grupo = grupos.find((g) => g.fecha === clave);
    if (grupo) grupo.recuerdos.push(r);
    else grupos.push({ fecha: clave, recuerdos: [r] });
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera titulo="Recuerdos" subtitulo="Your real photos, arranged into a timeline on their own." volverA={`/viajes/${viaje.id}`} />

        <section className="card mb-6">
          {NATIVO ? (
            <button type="button" onClick={elegirDeGaleriaNativa} disabled={procesandoFotos} className="btn-primary w-full">
              📸 Pick photos from your gallery
            </button>
          ) : (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Pick photos from your device</span>
              <input type="file" accept="image/*" multiple onChange={importarFotos} disabled={procesandoFotos} className="input" />
            </label>
          )}
          <p className="mt-2 text-xs text-neutral-400">
            They're processed on your device (a light thumbnail, not the original photo), sorted by date and, when
            the photo has location saved in it, matched to the real place it was taken. Automatically picking the
            best photos needs image processing — that isn't built in this version.
          </p>
          {procesandoFotos && <p className="mt-2 text-sm text-neutral-500">Processing photos…</p>}
          {errorFotos && <p className="mt-2 text-sm text-amber-600">{errorFotos}</p>}
        </section>

        {ordenados.length === 0 ? (
          <p className="mb-6 text-sm text-neutral-500">No moments saved yet.</p>
        ) : (
          <div className="mb-6 space-y-5">
            {grupos.map((grupo) => (
              <div key={grupo.fecha}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  {grupo.fecha === "Sin fecha" ? "No date" : formatearFecha(grupo.fecha)}
                </p>
                <ol className="space-y-3 border-l border-neutral-200 pl-4">
                  {grupo.recuerdos.map((r) => (
                    <li key={r.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-marino-600" />
                      <div className="flex items-start justify-between gap-3">
                        {r.fotoDataUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.fotoDataUrl} alt={r.titulo} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{r.titulo}</p>
                          {r.lugar && r.lat != null && r.lon != null && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-marino-600 underline hover:text-marino-800"
                            >
                              📍 {r.lugar}
                            </a>
                          )}
                          {r.nota && <p className="mt-1 text-sm text-neutral-600">{r.nota}</p>}
                        </div>
                        <button onClick={() => eliminar(r.id)} className="shrink-0 text-neutral-400 hover:text-red-600">
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={agregar} className="card space-y-3">
          <p className="text-sm font-medium text-neutral-700">Or add a moment without a photo</p>
          <input className="input" placeholder="What happened?" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <textarea className="input min-h-20" placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <button type="submit" className="btn-primary w-full">
            + Save moment
          </button>
        </form>
      </div>
    </main>
  );
}
