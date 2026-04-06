import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { cadastrosRouter } from "./routers/cadastros";
import { financeiroRouter } from "./routers/financeiro";
import { usuariosRouter } from "./routers/usuarios";
import { planejamentosRouter } from "./routers/planejamentos";
import { portalLiderRouter } from "./routers/portalLider";
import { qrcodeRouter } from "./routers/qrcode";
import { relatoriosRouter } from "./routers/relatorios";
import { dashboardRouter } from "./routers/dashboard";
import { reportGenerationRouter } from "./routers/report-generation";
import { dashboardEnhancementsRouter } from "./routers/dashboard-enhancements";
import { dashboardAdvancedRouter } from "./routers/dashboard-advanced";
import { notificationsRouter } from "./routers/notifications";
import { auditRouter } from "./routers/audit";
import { fiscalRouter } from "./routers/fiscal";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Cadastros (Employees, Clients, Suppliers, Shifts, Functions, CostCenters, BankAccounts)
  cadastros: cadastrosRouter,

  // Financeiro (Accounts Payable/Receivable, Payment Batches, Dashboard KPIs)
  financeiro: financeiroRouter,

  // Planejamentos (Escalas de Trabalho)
  planejamentos: planejamentosRouter,

  // Gestão de Usuários e Permissões
  usuarios: usuariosRouter,

  // Portal do Lider
  portalLider: portalLiderRouter,

  // QR Code
  qrcode: qrcodeRouter,

  // Relatórios
  relatorios: relatoriosRouter,
  dashboard: dashboardRouter,
  fiscal: fiscalRouter,
  dashboardEnhancements: dashboardEnhancementsRouter,
  dashboardAdvanced: dashboardAdvancedRouter,
  reportGeneration: reportGenerationRouter,
  notifications: notificationsRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
