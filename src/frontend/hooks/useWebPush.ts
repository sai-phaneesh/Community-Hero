import { useCallback, useEffect } from "react";

export function useWebPush() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications.");
      return false;
    }
    if (Notification.permission === "granted") {
      return true;
    }
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  const triggerPush = useCallback((title: string, body: string) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
        });
      } catch (err) {
        console.error("Failed to show native browser notification:", err);
      }
    }
  }, []);

  useEffect(() => {
    // Proactively request permission on hook mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return {
    requestPermission,
    triggerPush,
    isSupported: "Notification" in window,
    permissionState: "Notification" in window ? Notification.permission : "unsupported",
  };
}
