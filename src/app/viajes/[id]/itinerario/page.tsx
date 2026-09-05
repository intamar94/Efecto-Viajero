"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// El itinerario ahora vive dentro de Ruta (una sola sección, no dos
// separadas): esto solo evita romper enlaces guardados a la ruta antigua.
export default function ItinerarioRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/viajes/${params.id}/ruta`);
  }, [params.id, router]);

  return null;
}
