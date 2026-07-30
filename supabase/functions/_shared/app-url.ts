// Domínio público oficial da plataforma (Sr. SMS).
// NUNCA usar domínios legados (ex.: soia.app.br) em links enviados por e-mail.
export const APP_PUBLIC_URL =
  (Deno.env.get("APP_PUBLIC_URL") || "https://srsms.com.br").replace(/\/+$/, "");

export const buildAppUrl = (path: string): string => {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${APP_PUBLIC_URL}${clean}`;
};

export const MAIL_FROM = "Sr. SMS <noreply@soia.app.br>";
