import { broadcastNotification, broadcastToRole, broadcastToDepartment } from './websocket';

export { broadcastNotification, broadcastToRole, broadcastToDepartment };

export async function notifyOvertimeApproval(
  userId: number,
  employeeName: string,
  hours: number,
  status: 'approved' | 'rejected'
) {
  const title = status === 'approved' ? '✅ Horas Extras Aprovadas' : '❌ Horas Extras Rejeitadas';
  const message = `${employeeName} teve ${hours}h de horas extras ${status === 'approved' ? 'aprovadas' : 'rejeitadas'}.`;
  await broadcastNotification({
    type: status === 'approved' ? 'info' : 'error',
    title,
    message,
    userId,
    data: { employeeName, hours, status },
  });
}

export async function notifyVacationApproval(
  userId: number,
  employeeName: string,
  startDate: string,
  endDate: string,
  status: 'approved' | 'rejected'
) {
  const title = status === 'approved' ? '✅ Férias Aprovadas' : '❌ Férias Rejeitadas';
  const message = `${employeeName} teve férias de ${startDate} a ${endDate} ${status === 'approved' ? 'aprovadas' : 'rejeitadas'}.`;
  await broadcastNotification({
    type: status === 'approved' ? 'info' : 'error',
    title,
    message,
    userId,
    data: { employeeName, startDate, endDate, status },
  });
}

export async function notifyJobApproval(
  departmentId: string,
  jobTitle: string,
  status: 'approved' | 'rejected'
) {
  const title = status === 'approved' ? '✅ Vaga Aprovada' : '❌ Vaga Rejeitada';
  const message = `Vaga "${jobTitle}" foi ${status === 'approved' ? 'aprovada' : 'rejeitada'}.`;
  await broadcastToDepartment(departmentId, {
    type: status === 'approved' ? 'info' : 'error',
    title,
    message,
    data: { jobTitle, status },
  });
}

export async function notifyAdminAlert(title: string, message: string, data?: Record<string, any>) {
  await broadcastToRole('admin', {
    type: 'alert',
    title,
    message,
    data,
  });
}

export async function notifyManagerAlert(title: string, message: string, data?: Record<string, any>) {
  await broadcastToRole('gestor', {
    type: 'alert',
    title,
    message,
    data,
  });
}
