import { NextResponse } from "next/server";
import { resolveDestination } from "@/lib/travelBrain/destinationResolver";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [], error: "La búsqueda necesita al menos 2 caracteres." }, { status: 400 });
  }

  try {
    const results = await resolveDestination(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "No se pudo consultar el resolvedor de destinos." }, { status: 502 });
  }
}
