import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

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

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/funcionarios" component={Employees} />
        <Route path="/funcionarios/:id" component={EmployeeDetail} />
        <Route path="/cargos" component={Positions} />
        <Route path="/ferias" component={Vacations} />
        <Route path="/saude" component={MedicalExams} />
        <Route path="/banco-horas" component={TimeBank} />
        <Route path="/documentos" component={Documents} />
        <Route path="/templates" component={DocumentTemplates} />
        <Route path="/gerador" component={DocumentGenerator} />
        <Route path="/integracao" component={Integration} />
        <Route path="/notificacoes" component={Notifications} />
        <Route path="/seguranca" component={SafetyHealth} />
        <Route path="/configuracoes" component={Settings} />
        <Route path="/relatorios" component={Reports} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
