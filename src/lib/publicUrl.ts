/**
 * Domínio público oficial da plataforma.
 * Sempre usar este helper ao gerar links que serão compartilhados
 * externamente (formulários, QR codes, e-mails), para evitar que o
 * link herde um domínio secundário/legado do navegador atual (ex: soia.app.br).
 */
export const PUBLIC_BASE_URL = "https://srsms.com.br";

/** Monta uma URL pública a partir de um path relativo. */
export const buildPublicUrl = (path: string): string => {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_BASE_URL}${clean}`;
};
