import { broadcastNotification, broadcastToRole, broadcastToDepartment } from './websocket';

// Eventos de aprovação de horas extras
export async function notifyOvertimeApproval(
  userId: string,
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
    timestamp: Date.now(),
  });
}

// Eventos de aprovação de férias
export async function notifyVacationApproval(
  userId: string,
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
    timestamp: Date.now(),
  });
}

// Eventos de aprovação de vagas
export async function notifyJobApproval(
  departmentId: string,
  jobTitle: string,
  status: 'approved' | 'rejected'
) {
  const title = status === 'approved' ? '✅ Vaga Aprovada' : '❌ Vaga Rejeitada';
  const message = `A vaga de ${jobTitle} foi ${status === 'approved' ? 'aprovada' : 'rejeitada'} e está ${status === 'approved' ? 'pronta para publicação' : 'em revisão'}.`;

  await broadcastToDepartment(departmentId, {
    type: status === 'approved' ? 'info' : 'error',
    title,
    message,
    data: { jobTitle, status },
    timestamp: Date.now(),
  });
}

// Alertas de ponto atrasado
export async function notifyLateClockIn(
  userId: string,
  employeeName: string,
  minutesLate: number
) {
  await broadcastNotification({
    type: 'alert',
    title: '⏰ Ponto Atrasado',
    message: `${employeeName} registrou ponto com ${minutesLate} minutos de atraso.`,
    userId,
    data: { employeeName, minutesLate },
    timestamp: Date.now(),
  });
}

// Alertas de documentos vencidos
export async function notifyExpiredDocument(
  userId: string,
  employeeName: string,
  documentType: string,
  expiryDate: string
) {
  await broadcastNotification({
    type: 'alert',
    title: '⚠️ Documento Vencido',
    message: `${documentType} de ${employeeName} venceu em ${expiryDate}. Renovação necessária.`,
    userId,
    data: { employeeName, documentType, expiryDate },
    timestamp: Date.now(),
  });
}

// Alertas de exame médico vencido
export async function notifyExpiredMedicalExam(
  userId: string,
  employeeName: string,
  examType: string,
  expiryDate: string
) {
  await broadcastNotification({
    type: 'alert',
    title: '🏥 Exame Médico Vencido',
    message: `${examType} de ${employeeName} venceu em ${expiryDate}. Agendamento necessário.`,
    userId,
    data: { employeeName, examType, expiryDate },
    timestamp: Date.now(),
  });
}

// Notificação de novo candidato
export async function notifyNewCandidate(
  departmentId: string,
  candidateName: string,
  jobTitle: string
) {
  await broadcastToDepartment(departmentId, {
    type: 'info',
    title: '👤 Novo Candidato',
    message: `${candidateName} se candidatou para a vaga de ${jobTitle}.`,
    data: { candidateName, jobTitle },
    timestamp: Date.now(),
  });
}

// Notificação de onboarding pendente
export async function notifyPendingOnboarding(
  userId: string,
  employeeName: string,
  startDate: string
) {
  await broadcastNotification({
    type: 'info',
    title: '🎯 Onboarding Pendente',
    message: `${employeeName} inicia em ${startDate}. Checklist de onboarding aguardando conclusão.`,
    userId,
    data: { employeeName, startDate },
    timestamp: Date.now(),
  });
}

// Notificação de folha processada
export async function notifyPayrollProcessed(
  userId: string,
  employeeName: string,
  month: string,
  grossSalary: number
) {
  await broadcastNotification({
    type: 'info',
    title: '💰 Folha Processada',
    message: `Folha de ${month} de ${employeeName} foi processada. Salário bruto: R$ ${grossSalary.toFixed(2)}.`,
    userId,
    data: { employeeName, month, grossSalary },
    timestamp: Date.now(),
  });
}

// Notificação de banco de horas atualizado
export async function notifyTimeBank(
  userId: string,
  employeeName: string,
  balance: number,
  operation: 'added' | 'deducted'
) {
  const verb = operation === 'added' ? 'adicionadas' : 'deduzidas';
  const sign = operation === 'added' ? '+' : '-';
  
  await broadcastNotification({
    type: 'info',
    title: '⏱️ Banco de Horas Atualizado',
    message: `${Math.abs(balance)}h ${verb} ao banco de horas de ${employeeName}. Saldo: ${sign}${Math.abs(balance)}h`,
    userId,
    data: { employeeName, balance, operation },
    timestamp: Date.now(),
  });
}
