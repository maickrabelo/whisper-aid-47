/**
 * Error sanitization utility to prevent information leakage
 * Maps database and system errors to user-friendly messages
 */

const safeErrorMessages: Record<string, string> = {
  // PostgreSQL error codes
  '23505': 'Este registro já existe no sistema.',
  '23503': 'Referência não encontrada. Verifique os dados relacionados.',
  '23514': 'Dados inválidos fornecidos.',
  '23502': 'Campo obrigatório não preenchido.',
  '42501': 'Permissão negada para realizar esta operação.',
  '42P01': 'Recurso não encontrado.',
  
  // Auth errors
  'auth/': 'Erro de autenticação. Verifique suas credenciais.',
  'Invalid login credentials': 'Email ou senha incorretos.',
  'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
  'User already registered': 'Este email já está registrado.',
  
  // PostgREST errors
  'PGRST': 'Erro ao processar solicitação.',
  
  // Network errors
  'Failed to fetch': 'Erro de conexão. Verifique sua internet.',
  'NetworkError': 'Erro de rede. Tente novamente.',
  
  // Permission errors
  'permission denied': 'Você não tem permissão para realizar esta ação.',
  'row-level security': 'Acesso negado aos dados solicitados.',
};

/**
 * Sanitizes error messages to prevent information disclosure
 * @param error - The error object from database or API calls
 * @returns A safe, user-friendly error message
 */
export function getSafeErrorMessage(error: any): string {
  // Handle null/undefined errors
  if (!error) {
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  // Get error message
  const errorMessage = error.message || error.msg || String(error);
  const errorCode = error.code || '';

  // Log full error server-side only (not in production console)
  if (import.meta.env.DEV) {
    console.error('Full error details:', {
      message: errorMessage,
      code: errorCode,
      details: error
    });
  }

  // Check for exact matches or partial matches
  for (const [key, safeMsg] of Object.entries(safeErrorMessages)) {
    if (errorCode.includes(key) || errorMessage.includes(key)) {
      return safeMsg;
    }
  }

  // Default safe message
  return 'Ocorreu um erro. Por favor, tente novamente ou entre em contato com o suporte.';
}

/**
 * Creates a sanitized error response for edge functions
 * @param error - The error object
 * @param statusCode - HTTP status code (default: 500)
 * @returns Response object with sanitized error
 */
export function createSafeErrorResponse(error: any, statusCode: number = 500): Response {
  const safeMessage = getSafeErrorMessage(error);
  
  return new Response(
    JSON.stringify({ 
      success: false,
      error: safeMessage 
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export const translatePasswordError = (msg?: string): string => {
  const m = msg || '';
  if (/weak|easy to guess|pwned/i.test(m)) return 'Essa senha é muito comum. Escolha outra senha, misturando letras, números e símbolos.';
  if (/should be different|same password/i.test(m)) return 'A nova senha precisa ser diferente da senha atual.';
  if (/at least|characters/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
  return m || 'Tente novamente.';
};
