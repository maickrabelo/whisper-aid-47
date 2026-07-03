// AEP liberado para todos os usuários (gestores SST e demais perfis autorizados).
// Hook mantido para compatibilidade com os consumidores existentes.
export function useAEPBetaAccess() {
  return { allowed: true, loading: false };
}
