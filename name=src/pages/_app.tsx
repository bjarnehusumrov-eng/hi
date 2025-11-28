import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { translations, Lang } from "@/i18n";

import { createContext, useEffect, useState } from "react";

export const I18nContext = createContext({
  lang: "en" as Lang,
  t: (k: string) => k
});

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [lang, setLang] = useState<Lang>("en");
  const t = (key: string) => (translations[lang][key] ? translations[lang][key] : key);

  useEffect(() => {
    const saved = localStorage.getItem("ss_lang") as Lang | null;
    if (saved) setLang(saved);
  }, []);

  return (
    <SessionProvider session={session}>
      <I18nContext.Provider value={{ lang, t }}>
        <Component {...pageProps} setLang={(l: Lang) => { setLang(l); localStorage.setItem("ss_lang", l); }} />
      </I18nContext.Provider>
    </SessionProvider>
  );
}
