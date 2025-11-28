import { useContext } from "react";
import { I18nContext } from "@/pages/_app";

export default function LanguageChooser({ setLang }: { setLang: (l: any) => void }) {
  const { t } = useContext(I18nContext as any);
  return (
    <div className="language-chooser full-screen">
      <h1>{t("language.choose_title")}</h1>
      <p>{t("language.choose_subtitle")}</p>
      <div className="buttons">
        <button onClick={() => setLang("en")}>English</button>
        <button onClick={() => setLang("no")}>Norsk</button>
      </div>
    </div>
  );
}
