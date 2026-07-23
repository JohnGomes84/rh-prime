import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [userAgent, setUserAgent] = useState("");

  useEffect(() => {
    setUserAgent(typeof navigator === "undefined" ? "" : navigator.userAgent);
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const navigatorStandalone = typeof navigator !== "undefined" && "standalone" in navigator
      ? Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      : false;
    setIsInstalled(Boolean(standalone || navigatorStandalone));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const canInstall = useMemo(() => !isInstalled && Boolean(deferredPrompt), [deferredPrompt, isInstalled]);
  const deviceInfo = useMemo(() => {
    const ua = userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua)
      || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|android|crios|fxios|edgios/.test(ua);
    return {
      isIOS,
      isAndroid,
      isSafari,
    };
  }, [userAgent]);

  const promptInstall = async () => {
    if (!deferredPrompt) return null;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    return result;
  };

  return {
    canInstall,
    isInstalled,
    promptInstall,
    deviceInfo,
  };
}
