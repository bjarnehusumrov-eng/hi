import { useContext, useEffect, useState } from "react";
import { I18nContext } from "@/pages/_app";

export default function InstallPrompt() {
  const { t } = useContext(I18nContext as any);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem("install_dismissed_at");
      const allow = !dismissed || Date.now() - Number(dismissed) > 7 * 24 * 60 * 60 * 1000;
      if (allow && deferredPrompt) {
        setShow(true);
      } else if (allow && !deferredPrompt) {
        // still show a gentle prompt if browser doesn't support the event
        setShow(true);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [deferredPrompt]);

  const onInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
      } else {
        localStorage.setItem("install_dismissed_at", String(Date.now()));
        setShow(false);
      }
    } else {
      // fallback: show instructions to add to home screen
      localStorage.setItem("install_dismissed_at", String(Date.now()));
      setShow(false);
    }
  };

  const onNotNow = () => {
    localStorage.setItem("install_dismissed_at", String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="install-prompt card">
      <h3>{t("install.prompt.title")}</h3>
      <p>{t("install.prompt.body")}</p>
      <div className="actions">
        <button onClick={onInstall}>{t("buttons.install_now")}</button>
        <button onClick={onNotNow}>{t("buttons.not_now")}</button>
      </div>
    </div>
  );
}
