import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { NotificationBell } from "./components/NotificationBell";
import { NotificationToast } from "./components/NotificationToast";
import { ConsentBanner } from "./components/ConsentBanner";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AdminGuard, ManagerGuard } from "./components/RouteGuard";

const Home = lazy(() => import("./pages/Home"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeDetail = lazy(() => import("./pages/EmployeeDetail"));
const Positions = lazy(() => import("./pages/Positions"));
const Vacations = lazy(() => import("./pages/Vacations"));
const MedicalExams = lazy(() => import("./pages/MedicalExams"));
const TimeBank = lazy(() => import("./pages/TimeBank"));
const Documents = lazy(() => import("./pages/Documents"));
const DocumentTemplates = lazy(() => import("./pages/DocumentTemplates"));
const DocumentGenerator = lazy(() => import("./pages/DocumentGenerator"));
const SafetyHealth = lazy(() => import("./pages/SafetyHealth"));
const Integration = lazy(() => import("./pages/Integration"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports"));
const ManagerialReports = lazy(() => import("./pages/ManagerialReports"));
const OperationalRoutines = lazy(() => import("./pages/OperationalRoutines"));
const Recruitment = lazy(() => import("./pages/Recruitment"));
const Timesheet = lazy(() => import("./pages/Timesheet"));
const Payroll = lazy(() => import("./pages/Payroll"));
const ProfessionalAssessment = lazy(() => import("./pages/ProfessionalAssessment"));
const Audit = lazy(() => import("./pages/Audit"));
const PeopleAnalytics = lazy(() => import("./pages/PeopleAnalytics"));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: (m as any).default || (m as any).Login || (() => null) })));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UserManagement = lazy(() => import("./pages/UserManagement").then(m => ({ default: (m as any).default || (m as any).UserManagement || (() => null) })));
const UserHierarchy = lazy(() => import("./pages/UserHierarchy").then(m => ({ default: (m as any).default || (m as any).UserHierarchy || (() => null) })));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings").then(m => ({ default: (m as any).default || (m as any).SecuritySettings || (() => null) })));
const SignContracts = lazy(() => import("./pages/SignContracts").then(m => ({ default: (m as any).default || (m as any).SignContracts || (() => null) })));
const SignASOs = lazy(() => import("./pages/SignASOs").then(m => ({ default: (m as any).default || (m as any).SignASOs || (() => null) })));
const SignatureAudit = lazy(() => import("./pages/SignatureAudit").then(m => ({ default: (m as any).default || (m as any).SignatureAudit || (() => null) })));
const OvertimeManagement = lazy(() => import("./pages/OvertimeManagement").then(m => ({ default: m.OvertimeManagement })));
const Payslip = lazy(() => import("./pages/Payslip").then(m => ({ default: m.Payslip })));
const Calculators = lazy(() => import("./pages/Calculators"));
const JourneyAdmin = lazy(() => import("./pages/JourneyAdmin"));
const Departments = lazy(() => import("./pages/Departments"));
const AdmissionList = lazy(() => import("./pages/AdmissionList"));
const AdmissionDetail = lazy(() => import("./pages/AdmissionDetail"));
const TerminationList = lazy(() => import("./pages/TerminationList"));
const TerminationDetail = lazy(() => import("./pages/TerminationDetail"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Demands = lazy(() => import("./pages/Demands"));
const Privacy = lazy(() => import("./pages/Privacy"));
const CompliancePortaria = lazy(() => import("./pages/CompliancePortaria"));
const KanbanBoards = lazy(() => import("./pages/KanbanBoards"));
const KanbanBoard = lazy(() => import("./pages/KanbanBoard"));
const KanbanBoardV2 = lazy(() => import("./pages/kanban-v2/KanbanBoardV2"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const guarded = (Component: React.ComponentType, kind: "admin" | "manager") => () => {
  if (kind === "admin") {
    return (
      <AdminGuard>
        <Component />
      </AdminGuard>
    );
  }
  return (
    <ManagerGuard>
      <Component />
    </ManagerGuard>
  );
};

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/funcionarios" component={guarded(Employees, "manager")} />
        <Route path="/funcionarios/:id" component={guarded(EmployeeDetail, "manager")} />
        <Route path="/cargos" component={guarded(Positions, "admin")} />
        <Route path="/ferias" component={Vacations} />
        <Route path="/saude" component={guarded(SafetyHealth, "manager")} />
        <Route path="/banco-horas" component={TimeBank} />
        <Route path="/documentos" component={guarded(Documents, "manager")} />
        <Route path="/templates" component={guarded(DocumentTemplates, "admin")} />
        <Route path="/gerador" component={guarded(DocumentGenerator, "admin")} />
        <Route path="/integracao" component={guarded(Integration, "admin")} />
        <Route path="/notificacoes" component={Notifications} />
        <Route path="/configuracoes" component={guarded(Settings, "admin")} />
        <Route path="/relatorios" component={guarded(Reports, "manager")} />
        <Route path="/relatorios-gerenciais" component={guarded(ManagerialReports, "manager")} />
        <Route path="/rotinas-operacionais" component={guarded(OperationalRoutines, "manager")} />
        <Route path="/recrutamento" component={guarded(Recruitment, "manager")} />
        <Route path="/ponto" component={Timesheet} />
        <Route path="/horas-extras" component={OvertimeManagement} />
        <Route path="/folha" component={guarded(Payroll, "admin")} />
        <Route path="/holerite" component={Payslip} />
        <Route path="/calculadoras" component={Calculators} />
        <Route path="/jornada-admin" component={guarded(JourneyAdmin, "manager")} />
        <Route path="/departamentos" component={guarded(Departments, "admin")} />
        <Route path="/admissao" component={guarded(AdmissionList, "admin")} />
        <Route path="/admissao/:id" component={guarded(AdmissionDetail, "admin")} />
        <Route path="/desligamento" component={guarded(TerminationList, "admin")} />
        <Route path="/desligamento/:id" component={guarded(TerminationDetail, "admin")} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/demandas" component={Demands} />
        <Route path="/privacidade" component={Privacy} />
        <Route path="/compliance-jornada" component={guarded(CompliancePortaria, "admin")} />
        <Route path="/kanban" component={KanbanBoards} />
        <Route path="/kanban/:id" component={KanbanBoard} />
        <Route path="/kanban-v2" component={KanbanBoardV2} />
        <Route path="/avaliacoes" component={guarded(ProfessionalAssessment, "manager")} />
        <Route path="/auditoria" component={guarded(Audit, "admin")} />
        <Route path="/analytics" component={guarded(PeopleAnalytics, "manager")} />
        <Route path="/login" component={Login} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/usuarios" component={guarded(UserManagement, "admin")} />
        <Route path="/hierarquia" component={guarded(UserHierarchy, "admin")} />
        <Route path="/seguranca-config" component={guarded(SecuritySettings, "admin")} />
        <Route path="/assinar-contratos" component={guarded(SignContracts, "admin")} />
        <Route path="/assinar-asos" component={guarded(SignASOs, "admin")} />
        <Route path="/auditoria-assinaturas" component={guarded(SignatureAudit, "admin")} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <NotificationBell />
            <NotificationToast />
            <ConsentBanner />
            <Router />
          </TooltipProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
