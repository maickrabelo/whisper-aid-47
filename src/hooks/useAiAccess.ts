// IA desativada em todo o Sr.SMS (nenhum plano possui IA).
export function resetAiAccessCache() {
  // no-op: mantido por compatibilidade
}

export function useAiAccess() {
  return { hasAccess: false, isLoading: false };
}
