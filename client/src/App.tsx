import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EmployeesPage = lazy(() => import("./pages/Employees"));
const ClientsPage = lazy(() => import("./pages/Clients"));
const SuppliersPage = lazy(() => import("./pages/Suppliers"));
const ShiftsPage = lazy(() => import("./pages/Shifts"));
const FunctionsPage = lazy(() => import("./pages/Functions"));
const CostCentersPage = lazy(() => import("./pages/CostCenters"));
const BankAccountsPage = lazy(() => import("./pages/BankAccounts"));
const AccountsPayablePage = lazy(() => import("./pages/AccountsPayable"));
const AccountsReceivablePage = lazy(() => import("./pages/AccountsReceivable"));
const PaymentBatchesPage = lazy(() => import("./pages/PaymentBatches"));
const UsersPage = lazy(() => import("./pages/Users"));
const AnalyticsPage = lazy(() => import("./pages/Analytics"));
const DocumentsPage = lazy(() => import("./pages/Documents"));
const SchedulesPage = lazy(() => import("./pages/Schedules"));
const PortalLiderPage = lazy(() => import("./pages/PortalLider"));
const PixApprovalsPage = lazy(() => import("./pages/PixApprovals"));
const PaymentsPage = lazy(() => import("./pages/Payments"));
const AdminOccurrencesPage = lazy(() => import("./pages/AdminOccurrences"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Carregando...
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/">
          <Home />
        </Route>
        <Route path="/dashboard">
          <DashboardLayout><Dashboard /></DashboardLayout>
        </Route>
        <Route path="/employees">
          <DashboardLayout><EmployeesPage /></DashboardLayout>
        </Route>
        <Route path="/clients">
          <DashboardLayout><ClientsPage /></DashboardLayout>
        </Route>
        <Route path="/suppliers">
          <DashboardLayout><SuppliersPage /></DashboardLayout>
        </Route>
        <Route path="/shifts">
          <DashboardLayout><ShiftsPage /></DashboardLayout>
        </Route>
        <Route path="/functions">
          <DashboardLayout><FunctionsPage /></DashboardLayout>
        </Route>
        <Route path="/cost-centers">
          <DashboardLayout><CostCentersPage /></DashboardLayout>
        </Route>
        <Route path="/bank-accounts">
          <DashboardLayout><BankAccountsPage /></DashboardLayout>
        </Route>
        <Route path="/accounts-payable">
          <DashboardLayout><AccountsPayablePage /></DashboardLayout>
        </Route>
        <Route path="/accounts-receivable">
          <DashboardLayout><AccountsReceivablePage /></DashboardLayout>
        </Route>
        <Route path="/payment-batches">
          <DashboardLayout><PaymentBatchesPage /></DashboardLayout>
        </Route>
        <Route path="/users">
          <DashboardLayout><UsersPage /></DashboardLayout>
        </Route>
        <Route path="/analytics">
          <DashboardLayout><AnalyticsPage /></DashboardLayout>
        </Route>
        <Route path="/documents">
          <DashboardLayout><DocumentsPage /></DashboardLayout>
        </Route>
        <Route path="/schedules">
          <DashboardLayout><SchedulesPage /></DashboardLayout>
        </Route>
        <Route path="/payments">
          <DashboardLayout>
            <PaymentsPage />
          </DashboardLayout>
        </Route>
        <Route path="/portal-lider">
          <PortalLiderPage />
        </Route>
        <Route path="/pix-approvals">
          <DashboardLayout><PixApprovalsPage /></DashboardLayout>
        </Route>
        <Route path="/admin/occurrences">
          <DashboardLayout><AdminOccurrencesPage /></DashboardLayout>
        </Route>
        <Route path="/404">
          <NotFound />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
