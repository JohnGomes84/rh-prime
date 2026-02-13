import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { complianceRouter } from "./routers/compliance";
import { integrationsRouter } from "./routers/integrations";
import { authRbacRouter } from "./routers/auth-rbac";
import { rbacRouter } from "./routers/rbac";
import { auditCpfRouter } from "./routers/audit-cpf";

// ============================================================
// ROUTERS
// ============================================================
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

  // ============================================================
  // DASHBOARD
  // ============================================================
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return db.getDashboardStats();
    }),
  }),

  // ============================================================
  // EMPLOYEES
  // ============================================================
  employees: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.listEmployees(input?.search);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getEmployee(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        fullName: z.string().min(1),
        socialName: z.string().optional(),
        cpf: z.string().min(11),
        rg: z.string().optional(),
        birthDate: z.string().optional(),
        gender: z.enum(["M", "F", "Outro"]).optional(),
        maritalStatus: z.enum(["Solteiro", "Casado", "Divorciado", "Viúvo", "União Estável"]).optional(),
        nationality: z.string().optional(),
        educationLevel: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        addressStreet: z.string().optional(),
        addressNumber: z.string().optional(),
        addressComplement: z.string().optional(),
        addressNeighborhood: z.string().optional(),
        addressCity: z.string().optional(),
        addressState: z.string().optional(),
        addressZip: z.string().optional(),
        ctpsNumber: z.string().optional(),
        ctpsSeries: z.string().optional(),
        pisPasep: z.string().optional(),
        voterTitle: z.string().optional(),
        militaryCert: z.string().optional(),
        cnhNumber: z.string().optional(),
        cnhCategory: z.string().optional(),
        cnhExpiry: z.string().optional(),
        bankName: z.string().optional(),
        bankAgency: z.string().optional(),
        bankAccount: z.string().optional(),
        pixKey: z.string().optional(),
        status: z.enum(["Ativo", "Inativo", "Afastado", "Férias"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createEmployee(input as any);
        // Create default admission checklist
        await db.createDefaultAdmissionChecklist(result.id);
        return result;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        await db.updateEmployee(input.id, input.data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEmployee(input.id);
        return { success: true };
      }),
  }),

  // ============================================================
  // POSITIONS
  // ============================================================
  positions: router({
    list: protectedProcedure.query(async () => {
      return db.listPositions();
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getPosition(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        cboCode: z.string().optional(),
        description: z.string().optional(),
        department: z.string().optional(),
        baseSalary: z.string().optional(),
        hazardLevel: z.enum(["Nenhum", "Insalubridade", "Periculosidade"]).optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createPosition(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updatePosition(input.id, input.data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePosition(input.id);
        return { success: true };
      }),
  }),

  // ============================================================
  // CONTRACTS
  // ============================================================
  contracts: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listContracts(input?.employeeId);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getContract(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        positionId: z.number().optional(),
        contractType: z.enum(["CLT", "Estágio", "Temporário", "Experiência"]),
        hireDate: z.string(),
        experienceEndDate: z.string().optional(),
        experienceRenewed: z.boolean().optional(),
        workSchedule: z.string().optional(),
        weeklyHours: z.string().optional(),
        salary: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createContract(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateContract(input.id, input.data as any);
        return { success: true };
      }),
  }),

  // ============================================================
  // EMPLOYEE POSITIONS (Histórico)
  // ============================================================
  employeePositions: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return db.listEmployeePositions(input.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        positionId: z.number(),
        salary: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        changeReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createEmployeePosition(input as any);
      }),
  }),

  // ============================================================
  // VACATIONS
  // ============================================================
  vacations: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listVacations(input?.employeeId);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getVacation(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        acquisitionStart: z.string(),
        acquisitionEnd: z.string(),
        concessionLimit: z.string(),
        daysEntitled: z.number().default(30),
      }))
      .mutation(async ({ input }) => {
        return db.createVacation(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateVacation(input.id, input.data as any);
        return { success: true };
      }),
    overdue: protectedProcedure.query(async () => {
      return db.getOverdueVacations();
    }),
    upcoming: protectedProcedure
      .input(z.object({ daysAhead: z.number().default(60) }).optional())
      .query(async ({ input }) => {
        return db.getUpcomingVacationDeadlines(input?.daysAhead);
      }),
  }),

  // ============================================================
  // VACATION PERIODS
  // ============================================================
  vacationPeriods: router({
    list: protectedProcedure
      .input(z.object({ vacationId: z.number() }))
      .query(async ({ input }) => {
        return db.listVacationPeriods(input.vacationId);
      }),
    listByEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return db.listVacationPeriodsByEmployee(input.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        vacationId: z.number(),
        employeeId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        days: z.number(),
        isPecuniaryAllowance: z.boolean().optional(),
        pecuniaryDays: z.number().optional(),
        noticeDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createVacationPeriod(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateVacationPeriod(input.id, input.data as any);
        return { success: true };
      }),
  }),

  // ============================================================
  // MEDICAL EXAMS
  // ============================================================
  medicalExams: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listMedicalExams(input?.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        examType: z.enum(["Admissional", "Periódico", "Demissional", "Retorno", "Mudança de Função"]),
        examDate: z.string(),
        expiryDate: z.string(),
        result: z.enum(["Apto", "Inapto", "Apto com Restrições"]).optional(),
        doctorName: z.string().optional(),
        crm: z.string().optional(),
        clinicName: z.string().optional(),
        observations: z.string().optional(),
        documentUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createMedicalExam(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateMedicalExam(input.id, input.data as any);
        return { success: true };
      }),
    expired: protectedProcedure.query(async () => {
      return db.getExpiredExams();
    }),
    upcoming: protectedProcedure
      .input(z.object({ daysAhead: z.number().default(30) }).optional())
      .query(async ({ input }) => {
        return db.getUpcomingExamExpirations(input?.daysAhead);
      }),
  }),

  // ============================================================
  // LEAVES
  // ============================================================
  leaves: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listLeaves(input?.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        leaveType: z.enum(["Médico", "INSS", "Maternidade", "Paternidade", "Acidente de Trabalho", "Outros"]),
        startDate: z.string(),
        expectedReturnDate: z.string().optional(),
        inssProtocol: z.string().optional(),
        observations: z.string().optional(),
        documentUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createLeave(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateLeave(input.id, input.data as any);
        return { success: true };
      }),
  }),

  // ============================================================
  // TIME BANK
  // ============================================================
  timeBank: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listTimeBank(input?.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        referenceMonth: z.string(),
        hoursBalance: z.string(),
        expiryDate: z.string(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createTimeBankEntry(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateTimeBankEntry(input.id, input.data as any);
        return { success: true };
      }),
    expiring: protectedProcedure
      .input(z.object({ daysAhead: z.number().default(30) }).optional())
      .query(async ({ input }) => {
        return db.getExpiringTimeBank(input?.daysAhead);
      }),
  }),

  // ============================================================
  // BENEFITS
  // ============================================================
  benefits: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listBenefits(input?.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        benefitType: z.enum(["Vale Transporte", "Vale Alimentação", "Vale Refeição", "Plano de Saúde", "Plano Odontológico", "Seguro de Vida", "Outros"]),
        provider: z.string().optional(),
        planName: z.string().optional(),
        value: z.string().optional(),
        employeeContribution: z.string().optional(),
        optedOut: z.boolean().optional(),
        startDate: z.string(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createBenefit(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateBenefit(input.id, input.data as any);
        return { success: true };
      }),
  }),

  // ============================================================
  // DOCUMENTS (GED)
  // ============================================================
  documents: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional(), category: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.listDocuments(input?.employeeId, input?.category);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        category: z.enum(["Pessoal", "Contratual", "Saúde e Segurança", "Benefícios", "Termos", "Treinamentos", "Outros"]),
        documentName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
        expiryDate: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createDocument(input as any);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDocument(input.id);
        return { success: true };
      }),
    upload: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        category: z.enum(["Pessoal", "Contratual", "Saúde e Segurança", "Benefícios", "Termos", "Treinamentos", "Outros"]),
        documentName: z.string(),
        fileBase64: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        expiryDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `documents/${input.employeeId}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        return db.createDocument({
          employeeId: input.employeeId,
          category: input.category,
          documentName: input.documentName,
          fileUrl: url,
          fileKey,
          fileType: input.fileType.split("/").pop() ?? input.fileType,
          fileSize: input.fileSize,
          expiryDate: input.expiryDate,
        } as any);
      }),
  }),

  // ============================================================
  // CHECKLIST
  // ============================================================
  checklist: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number(), checklistType: z.string().optional() }))
      .query(async ({ input }) => {
        return db.listChecklistItems(input.employeeId, input.checklistType);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateChecklistItem(input.id, input.data as any);
        return { success: true };
      }),
    createDefault: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .mutation(async ({ input }) => {
        await db.createDefaultAdmissionChecklist(input.employeeId);
        return { success: true };
      }),
  }),

  // ============================================================
  // EQUIPMENT
  // ============================================================
  equipment: router({
    list: protectedProcedure.query(async () => {
      return db.listEquipment();
    }),
    create: protectedProcedure
      .input(z.object({
        equipmentType: z.string(),
        brand: z.string().optional(),
        model: z.string().optional(),
        serialNumber: z.string().optional(),
        imei: z.string().optional(),
        patrimonyCode: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createEquipmentItem(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateEquipmentItem(input.id, input.data as any);
        return { success: true };
      }),
  }),

  // ============================================================
  // EQUIPMENT LOANS
  // ============================================================
  equipmentLoans: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listEquipmentLoans(input?.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        equipmentId: z.number(),
        employeeId: z.number(),
        loanDate: z.string(),
        conditionAtLoan: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Mark equipment as emprestado
        await db.updateEquipmentItem(input.equipmentId, { status: "Emprestado" } as any);
        return db.createEquipmentLoan(input as any);
      }),
    return: protectedProcedure
      .input(z.object({
        id: z.number(),
        equipmentId: z.number(),
        returnDate: z.string(),
        conditionAtReturn: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateEquipmentLoan(input.id, {
          returnDate: input.returnDate,
          conditionAtReturn: input.conditionAtReturn,
          status: "Devolvido",
        } as any);
        await db.updateEquipmentItem(input.equipmentId, { status: "Disponível" } as any);
        return { success: true };
      }),
  }),

  // ============================================================
  // PPE DELIVERIES (EPIs)
  // ============================================================
  ppeDeliveries: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listPpeDeliveries(input?.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        ppeDescription: z.string(),
        caNumber: z.string().optional(),
        quantity: z.number(),
        deliveryDate: z.string(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createPpeDelivery(input as any);
      }),
  }),

  // ============================================================
  // TRAININGS
  // ============================================================
  trainings: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listTrainings(input?.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        trainingName: z.string(),
        nrReference: z.string().optional(),
        trainingDate: z.string(),
        expiryDate: z.string().optional(),
        hours: z.string().optional(),
        provider: z.string().optional(),
        certificateUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createTraining(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateTraining(input.id, input.data as any);
        return { success: true };
      }),
  }),

  // ============================================================
  // SERVICE ORDERS
  // ============================================================
  serviceOrders: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listServiceOrders(input?.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        positionId: z.number().optional(),
        nrReference: z.string().optional(),
        activities: z.string().optional(),
        risks: z.string().optional(),
        recommendedPpe: z.string().optional(),
        preventiveMeasures: z.string().optional(),
        requiredTrainings: z.string().optional(),
        issueDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        return db.createServiceOrder(input as any);
      }),
  }),

  // ============================================================
  // DOCUMENT TEMPLATES
  // ============================================================
  documentTemplates: router({
    list: protectedProcedure.query(async () => {
      return db.listDocumentTemplates();
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getDocumentTemplate(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        templateName: z.string(),
        templateType: z.enum(["Termo de Responsabilidade", "Declaração de Pendência", "Ficha de EPI", "Ordem de Serviço", "Aviso de Férias", "Outros"]),
        content: z.string(),
        placeholders: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createDocumentTemplate(input as any);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.any()) }))
      .mutation(async ({ input }) => {
        await db.updateDocumentTemplate(input.id, input.data as any);
        return { success: true };
      }),
    generate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        employeeId: z.number(),
        extraData: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const template = await db.getDocumentTemplate(input.templateId);
        if (!template) throw new Error("Template não encontrado");
        const employee = await db.getEmployee(input.employeeId);
        if (!employee) throw new Error("Funcionário não encontrado");

        let content = template.content;
        // Replace employee placeholders
        content = content.replace(/\{\{NOME_FUNCIONARIO\}\}/g, employee.fullName);
        content = content.replace(/\{\{CPF\}\}/g, employee.cpf);
        content = content.replace(/\{\{RG\}\}/g, employee.rg ?? "");
        content = content.replace(/\{\{EMAIL\}\}/g, employee.email ?? "");
        content = content.replace(/\{\{TELEFONE\}\}/g, employee.phone ?? "");
        content = content.replace(/\{\{ENDERECO\}\}/g, `${employee.addressStreet ?? ""}, ${employee.addressNumber ?? ""} ${employee.addressComplement ?? ""} - ${employee.addressNeighborhood ?? ""}, ${employee.addressCity ?? ""}/${employee.addressState ?? ""} - ${employee.addressZip ?? ""}`);
        content = content.replace(/\{\{DATA_ATUAL\}\}/g, new Date().toLocaleDateString("pt-BR"));

        // Replace extra data placeholders
        if (input.extraData) {
          for (const [key, value] of Object.entries(input.extraData)) {
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value as string);
          }
        }

        return { content, templateName: template.templateName };
      }),
  }),

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  notifications: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return db.listNotifications(input?.unreadOnly);
      }),
    count: protectedProcedure.query(async () => {
      return db.countUnreadNotifications();
    }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationRead(input.id);
        return { success: true };
      }),
    markAllRead: protectedProcedure.mutation(async () => {
      await db.markAllNotificationsRead();
      return { success: true };
    }),
    create: protectedProcedure
      .input(z.object({
        type: z.enum(["Férias", "ASO", "Banco de Horas", "Contrato Experiência", "Treinamento", "Documento", "EPI", "Geral"]),
        title: z.string(),
        message: z.string(),
        severity: z.enum(["Info", "Aviso", "Crítico"]).optional(),
        relatedEmployeeId: z.number().optional(),
        dueDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createNotification(input as any);
      }),
  }),

  // ============================================================
  // HOLIDAYS
  // ============================================================
  holidays: router({
    list: protectedProcedure.query(async () => {
      return db.listHolidays();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        date: z.string(),
        type: z.enum(["Nacional", "Estadual", "Municipal"]).optional(),
        recurring: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createHoliday(input as any);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteHoliday(input.id);
        return { success: true };
      }),
  }),

  // ============================================================
  // SETTINGS
  // ============================================================
  settings: router({
    list: protectedProcedure.query(async () => {
      return db.listSettings();
    }),
    get: protectedProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return db.getSetting(input.key);
      }),
    upsert: protectedProcedure
      .input(z.object({ key: z.string(), value: z.string(), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.upsertSetting(input.key, input.value, input.description);
        return { success: true };
      }),
  }),

  // ============================================================
  // DEPENDENTS
  // ============================================================
  dependents: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return db.listDependents(input.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        name: z.string(),
        relationship: z.enum(["Cônjuge", "Filho(a)", "Enteado(a)", "Pai/Mãe", "Outros"]),
        birthDate: z.string().optional(),
        cpf: z.string().optional(),
        irDeduction: z.boolean().optional(),
        familySalary: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createDependent(input as any);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDependent(input.id);
        return { success: true };
      }),
  }),

  // ============================================================
  // ABSENCES
  // ============================================================
  absences: router({
    list: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return db.listAbsences(input.employeeId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        absenceDate: z.string(),
        justified: z.boolean().optional(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createAbsence(input as any);
      }),
  }),

   // ============================================================
  // INTEGRATIONS
  // ============================================================
  integrations: integrationsRouter,
  // ============================================================
  // COMPLIANCE REPORTS
  // ============================================================
  compliance: complianceRouter,
  // ============================================================
  // AUTH RBAC
  // ============================================================
  authRbac: authRbacRouter,
  rbac: rbacRouter,
  // ============================================================
  // AUDIT BY CPF
  // ============================================================
  auditCpf: auditCpfRouter,
});

export type AppRouter = typeof appRouter;
