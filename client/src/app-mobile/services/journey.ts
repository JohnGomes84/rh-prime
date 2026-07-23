export function getJourneyReasonLabel(reasonCode?: string) {
  switch (reasonCode) {
    case "eligible":
      return "Apto para registrar no novo motor de jornada.";
    case "missing_policy":
      return "Sem política de jornada configurada no Journey V2.";
    case "employee_not_active":
      return "O cadastro do funcionário não está ativo para uso de ponto.";
    case "contract_not_active":
      return "Não foi encontrado contrato ativo para a data de hoje.";
    case "time_tracking_not_required":
      return "Este colaborador não precisa registrar ponto neste contexto.";
    case "missing_active_context":
      return "Falta contexto ativo de alocação para permitir a batida.";
    case "missing_required_context":
      return "A política exige cliente, posto ou contrato válido para a batida.";
    default:
      return "Status de elegibilidade indisponível.";
  }
}

export function getTimesheetCompetence(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  const periodStart = day >= 26
    ? new Date(year, month, 26)
    : new Date(year, month - 1, 26);
  const periodEnd = day >= 26
    ? new Date(year, month + 1, 25)
    : new Date(year, month, 25);

  const shortFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  const fullFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return {
    periodStart,
    periodEnd,
    shortLabel: `${shortFormatter.format(periodStart)} -> ${shortFormatter.format(periodEnd)}`,
    fullLabel: `${fullFormatter.format(periodStart)} a ${fullFormatter.format(periodEnd)}`,
  };
}
