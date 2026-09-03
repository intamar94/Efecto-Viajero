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
    <header className="mb-8">
      <Link href={volverA} className="text-sm text-neutral-400 hover:text-neutral-900">
        ← Volver
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{titulo}</h1>
      {subtitulo && <p className="mt-1 text-neutral-500">{subtitulo}</p>}
    </header>
  );
}
