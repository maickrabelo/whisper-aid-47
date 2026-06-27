/**
 * Sr.SMS is now the ONLY brand of this application.
 * This hook always returns true so all UI variants that branch on
 * `isSmsPlan` automatically use the Sr.SMS branding.
 */
export function useSmsPlan() {
  return { isSmsPlan: true, isLoading: false };
}
