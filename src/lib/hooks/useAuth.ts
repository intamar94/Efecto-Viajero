"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { onAuthStateChange, getCurrentUser } from "@/lib/supabase/auth-client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });

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
