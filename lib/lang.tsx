"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { Lang } from "./types";
import { LANG_COOKIE } from "./lang-cookie";

type LangState = { lang: Lang; setLang: (lang: Lang) => void };

function createLangStore(initial: Lang) {
  return createStore<LangState>((set) => ({
    lang: initial,
    setLang: (lang) => {
      document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.setAttribute("data-lang", lang);
      document.documentElement.lang = lang;
      set({ lang });
    },
  }));
}

const LangContext = createContext<StoreApi<LangState> | null>(null);

/** 서버가 읽은 cookie 값으로 초기화. 요청별 스토어이므로 서버 간 상태 누수가 없다. */
export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [store] = useState(() => createLangStore(initial));
  return <LangContext.Provider value={store}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  const store = useContext(LangContext);
  if (!store) throw new Error("useLang 은 LangProvider 안에서만 사용");
  return useStore(store, (s) => s.lang);
}

export function useSetLang() {
  const store = useContext(LangContext);
  if (!store) throw new Error("useSetLang 은 LangProvider 안에서만 사용");
  return useStore(store, (s) => s.setLang);
}
