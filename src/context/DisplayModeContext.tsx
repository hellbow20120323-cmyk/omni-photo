import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UiDisplayMode = "bilingual" | "zh-only";

const STORAGE_KEY = "omniPhotoUiDisplay";

type Ctx = {
  mode: UiDisplayMode;
  setMode: (m: UiDisplayMode) => void;
};

const DisplayModeContext = createContext<Ctx | null>(null);

function readStoredMode(): UiDisplayMode {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "zh-only" || s === "bilingual") return s;
  } catch {
    /* ignore */
  }
  return "bilingual";
}

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UiDisplayMode>(readStoredMode);

  const setMode = useCallback((m: UiDisplayMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <DisplayModeContext.Provider value={value}>
      {children}
    </DisplayModeContext.Provider>
  );
}

export function useDisplayMode(): Ctx {
  const ctx = useContext(DisplayModeContext);
  if (!ctx) {
    throw new Error("useDisplayMode must be used within DisplayModeProvider");
  }
  return ctx;
}
