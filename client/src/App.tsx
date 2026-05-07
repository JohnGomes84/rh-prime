import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { NotificationBell } from "./components/NotificationBell";
import { NotificationToast } from "./components/NotificationToast";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
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
const Recruitment = lazy(() => import("./pages/Recruitment"));
const Timesheet = lazy(() => import("./pages/Timesheet"));
const Payroll = lazy(() => import("./pages/Payroll"));
const ProfessionalAssessment = lazy(() => import("./pages/ProfessionalAssessment"));
const Audit = lazy(() => import("./pages/Audit"));
const TimeTracking = lazy(() => import("./pages/TimeTracking").then((m) => ({ default: m.TimeTracking })));
const OvertimeManagement = lazy(() => import("./pages/OvertimeManagement").then((m) => ({ default: m.OvertimeManagement })));
const Payslip = lazy(() => import("./pages/Payslip").then((m) => ({ default: m.Payslip })));
const UserManagement = lazy(() => import("./pages/UserManagement").then((m) => ({ default: m.UserManagement })));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings").then((m) => ({ default: m.SecuritySettings })));
const SignContracts = lazy(() => import("./pages/SignContracts").then((m) => ({ default: m.SignContracts })));
const SignASOs = lazy(() => import("./pages/SignASOs").then((m) => ({ default: m.SignASOs })));
const SignatureAudit = lazy(() => import("./pages/SignatureAudit").then((m) => ({ default: m.SignatureAudit })));
const UserHierarchy = lazy(() => import("./pages/UserHierarchy").then((m) => ({ default: m.UserHierarchy })));
const AuditGeneral = lazy(() => import("./pages/AuditoriaGeral"));
const AdminResources = lazy(() => import("./pages/AdminRecursos"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const protect = (
  Component: React.ComponentType,
  roles?: Array<"admin" | "gestor" | "colaborador" | "user">
) => () => (
  <ProtectedRoute roles={roles}>
    <Component />
  </ProtectedRoute>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={protect(Home)} />
        <Route path="/funcionarios" component={protect(Employees)} />
        <Route path="/funcionarios/:id" component={protect(EmployeeDetail)} />
        <Route path="/cargos" component={protect(Positions)} />
        <Route path="/ferias" component={protect(Vacations)} />
        <Route path="/saude" component={protect(MedicalExams)} />
        <Route path="/banco-horas" component={protect(TimeBank)} />
        <Route path="/documentos" component={protect(Documents)} />
        <Route path="/templates" component={protect(DocumentTemplates, ["admin", "gestor"])} />
        <Route path="/gerador" component={protect(DocumentGenerator, ["admin", "gestor"])} />
        <Route path="/integracao" component={protect(Integration, ["admin"])} />
        <Route path="/notificacoes" component={protect(Notifications)} />
        <Route path="/seguranca" component={protect(SafetyHealth)} />
        <Route path="/configuracoes" component={protect(Settings, ["admin"])} />
        <Route path="/relatorios" component={protect(Reports, ["admin", "gestor"])} />
        <Route path="/recrutamento" component={protect(Recruitment, ["admin", "gestor"])} />
        <Route path="/ponto" component={protect(TimeTracking)} />
        <Route path="/ponto-historico" component={protect(Timesheet)} />
        <Route path="/horas-extras" component={protect(OvertimeManagement)} />
        <Route path="/folha" component={protect(Payroll, ["admin", "gestor"])} />
        <Route path="/holerite" component={protect(Payslip)} />
        <Route path="/avaliacoes" component={protect(ProfessionalAssessment, ["admin", "gestor"])} />
        <Route path="/auditoria" component={protect(Audit, ["admin"])} />
        <Route path="/auditoria-geral" component={protect(AuditGeneral, ["admin"])} />
        <Route path="/usuarios" component={protect(UserManagement, ["admin"])} />
        <Route path="/seguranca-config" component={protect(SecuritySettings, ["admin"])} />
        <Route path="/assinar-contratos" component={protect(SignContracts)} />
        <Route path="/assinar-asos" component={protect(SignASOs)} />
        <Route path="/auditoria-assinaturas" component={protect(SignatureAudit, ["admin"])} />
        <Route path="/hierarquia" component={protect(UserHierarchy, ["admin"])} />
        <Route path="/admin/recursos" component={protect(AdminResources, ["admin"])} />
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
            <Router />
          </TooltipProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
