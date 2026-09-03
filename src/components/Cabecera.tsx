import Link from "next/link";

export function Cabecera({
  titulo,
  subtitulo,
  volverA = "/",
}: {
  titulo: string;
  subtitulo?: string;
  volverA?: string;
}) {
  return (
    <header className="mb-6">
      <Link href={volverA} className="text-sm text-neutral-400 transition hover:text-marino-700">
        ← Volver
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">{titulo}</h1>
      {subtitulo && <p className="mt-1 text-sm text-neutral-500">{subtitulo}</p>}
    </header>
  );
}
