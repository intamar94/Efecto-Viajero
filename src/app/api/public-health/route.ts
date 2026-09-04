import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "efecto-viajero", deployment: "healthy", timestamp: new Date().toISOString() });
}
