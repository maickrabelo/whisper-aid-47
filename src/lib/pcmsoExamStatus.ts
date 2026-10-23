/** Civil dates are compared without timezone conversion; attendance is not a clinical result. */
export function examDeadline(dueDate: string, status: string, today: string) {
  if (status === 'cancelado' || status === 'compareceu') return 'encerrado';
  if (dueDate < today) return 'vencido';
  if (dueDate === today) return 'hoje';
  return 'a_vencer';
}