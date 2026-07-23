declare global {
  interface Window {
    umami?: {
      track: (eventName: string, payload?: Record<string, unknown>) => void;
    };
  }
}

type CollaboratorAppTelemetryPayload = Record<string, unknown>;

export function trackCollaboratorAppEvent(eventName: string, payload?: CollaboratorAppTelemetryPayload) {
  if (typeof window === "undefined") return;
  try {
    window.umami?.track?.(`collaborator-app:${eventName}`, payload);
  } catch (error) {
    console.warn("[CollaboratorAppTelemetry] failed to track event", error);
  }
}
