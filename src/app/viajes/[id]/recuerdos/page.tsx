"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { fechaDeImagen, miniaturaDeImagen } from "@/lib/fotos";

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
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  async function importarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (archivos.length === 0 || !viaje) return;

    setProcesandoFotos(true);
    setErrorFotos(null);
    try {
      const nuevos = await Promise.all(
        archivos.map(async (archivo) => {
          const [fotoDataUrl, fechaFoto] = await Promise.all([miniaturaDeImagen(archivo), fechaDeImagen(archivo)]);
          return {
            id: generarId(),
            titulo: archivo.name.replace(/\.[^.]+$/, ""),
            fecha: fechaFoto,
            fotoDataUrl,
          };
        })
      );
      actualizarViaje(viaje.id, { recuerdos: [...viaje.recuerdos, ...nuevos] });
    } catch {
      setErrorFotos("No hemos podido procesar alguna de las fotos. Prueba con otra o añade el momento a mano.");
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

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera titulo="Recuerdos" subtitulo="Tus fotos reales, ordenadas solas en una línea de tiempo." volverA={`/viajes/${viaje.id}`} />

        <section className="card mb-6">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Elige fotos de tu dispositivo</span>
            <input type="file" accept="image/*" multiple onChange={importarFotos} disabled={procesandoFotos} className="input" />
          </label>
          <p className="mt-2 text-xs text-neutral-400">
            Se procesan en tu navegador (miniatura ligera, no la foto original) y se ordenan por fecha automáticamente. La selección
            automática de las mejores fotos, el vídeo editado y el álbum para imprimir no están construidos en esta versión.
          </p>
          {procesandoFotos && <p className="mt-2 text-sm text-neutral-500">Procesando fotos…</p>}
          {errorFotos && <p className="mt-2 text-sm text-amber-600">{errorFotos}</p>}
        </section>

        {ordenados.length === 0 ? (
          <p className="mb-6 text-sm text-neutral-500">Todavía no hay momentos guardados.</p>
        ) : (
          <ol className="mb-6 space-y-3 border-l border-neutral-200 pl-4">
            {ordenados.map((r) => (
              <li key={r.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-marino-600" />
                <div className="flex items-start justify-between gap-3">
                  {r.fotoDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.fotoDataUrl} alt={r.titulo} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{r.titulo}</p>
                    {r.fecha && <p className="text-xs text-neutral-400">{r.fecha}</p>}
                    {r.nota && <p className="mt-1 text-sm text-neutral-600">{r.nota}</p>}
                  </div>
                  <button onClick={() => eliminar(r.id)} className="shrink-0 text-neutral-400 hover:text-red-600">
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <form onSubmit={agregar} className="card space-y-3">
          <p className="text-sm font-medium text-neutral-700">O añade un momento sin foto</p>
          <input className="input" placeholder="¿Qué pasó?" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <textarea className="input min-h-20" placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <button type="submit" className="btn-primary w-full">
            + Guardar momento
          </button>
        </form>
      </div>
    </main>
  );
}
