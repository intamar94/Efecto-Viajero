"use client";

import { useEffect, useState } from "react";
import { onAuthStateChange, getCurrentUser } from "@/lib/supabase/auth-client";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar usuario actual al montar
    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });

    // Escuchar cambios de auth
    const { data } = onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
    });

    return () => {
      data.subscription?.unsubscribe();
    };
  }, []);

  return { user, loading };
}
