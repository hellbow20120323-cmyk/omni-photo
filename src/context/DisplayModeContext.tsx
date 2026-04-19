import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** UI language: Chinese or English only (no mixed copy). */
export type UiLocale = "zh" | "en";

const STORAGE_KEY = "omniPhotoUiLocale";
const LEGACY_STORAGE_KEY = "omniPhotoUiDisplay";

type Ctx = {
  mode: UiLocale;
  setMode: (m: UiLocale) => void;
};

const DisplayModeContext = createContext<Ctx | null>(null);

function readStoredLocale(): UiLocale {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "zh" || s === "en") return s;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === "zh-only") return "zh";
    if (legacy === "bilingual") return "en";
  } catch {
    /* ignore */
  }
  return "zh";
}

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UiLocale>(readStoredLocale);

  const setMode = useCallback((m: UiLocale) => {
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
