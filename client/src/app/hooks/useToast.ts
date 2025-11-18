import { useCallback, useState } from "react";
import type { ToastKind, ToastState } from "../types";

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastKind = "info") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  return { toast, showToast };
}
