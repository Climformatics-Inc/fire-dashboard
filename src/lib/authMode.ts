export type AuthMode = "local" | "api";

export function getAuthMode(): AuthMode {
  const explicit = import.meta.env.VITE_AUTH_MODE as string | undefined;
  if (explicit === "local") {
    return "local";
  }
  if (explicit === "api") {
    return "api";
  }
  if (import.meta.env.VITE_USE_LOCAL_ADMIN === "true") {
    return "local";
  }
  return "api";
}

export function isLocalAdminMode(): boolean {
  return getAuthMode() === "local";
}
