"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  installGlobalErrorMonitor,
  installPresenceHeartbeat,
  trackEvent,
} from "@/shared/lib/telemetry";

export function ErrorMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    const onPageHide = () => {
      trackEvent("page_exit");
    };
    window.addEventListener("pagehide", onPageHide);
    const cleanupErrors = installGlobalErrorMonitor();
    const cleanupHeartbeat = installPresenceHeartbeat();
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      cleanupErrors();
      cleanupHeartbeat();
    };
  }, []);

  useEffect(() => {
    trackEvent("page_view", undefined, pathname || "/");
  }, [pathname]);

  return null;
}
