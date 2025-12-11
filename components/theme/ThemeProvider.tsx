"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: Theme;
  isReady: boolean;
  setTheme: (value: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "campuschat-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getPreferredTheme());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const preferred = getPreferredTheme();
    setThemeState(preferred);
    applyTheme(preferred);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    applyTheme(theme);
  }, [isReady, theme]);

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value);
    applyTheme(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme,
      isReady,
      setTheme,
      toggleTheme,
    }),
    [isReady, setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
