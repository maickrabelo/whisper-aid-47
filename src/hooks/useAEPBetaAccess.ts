import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ALLOWED_EMAILS = ["teste.sst@srsms.app"];

export function useAEPBetaAccess() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const email = data.user?.email?.toLowerCase() ?? "";
      setAllowed(ALLOWED_EMAILS.includes(email));
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { allowed, loading };
}
