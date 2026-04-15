import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  COMPANY_EMAIL_DOMAINS_LABEL,
  getLoginUrl,
  isOAuthConfigured,
} from "@/const";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, Users, Building2, Truck, Clock, Briefcase,
  Landmark, CreditCard, Receipt, Wallet, BarChart3, Shield,
  LogOut, PanelLeft, ChevronDown, CircleDollarSign, Settings,
  CalendarDays, UserCheck, Key, Sparkles, FolderOpen,
} from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { usePixNotifications } from "@/hooks/usePixNotifications";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

type MenuItem = {
  icon: any;
  label: string;
  path: string;
  module: string;
  group: string;
};

const allMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", module: "dashboard", group: "Principal" },
  { icon: BarChart3, label: "Analytics", path: "/analytics", module: "analytics", group: "Principal" },
  { icon: FolderOpen, label: "Documentos", path: "/documents", module: "documents", group: "Principal" },
  { icon: Users, label: "Funcionários", path: "/employees", module: "employees", group: "Cadastros" },
  { icon: Building2, label: "Clientes", path: "/clients", module: "clients", group: "Cadastros" },
  { icon: Truck, label: "Fornecedores", path: "/suppliers", module: "suppliers", group: "Cadastros" },
  { icon: Briefcase, label: "Funções", path: "/functions", module: "functions", group: "Cadastros" },
  { icon: Clock, label: "Turnos", path: "/shifts", module: "shifts", group: "Cadastros" },
  { icon: Settings, label: "Centros de Custo", path: "/cost-centers", module: "cost_centers", group: "Cadastros" },
  { icon: Landmark, label: "Contas Bancárias", path: "/bank-accounts", module: "bank_accounts", group: "Cadastros" },
  { icon: CalendarDays, label: "Planejamentos", path: "/schedules", module: "schedules", group: "Operações" },
  { icon: UserCheck, label: "Portal do Líder", path: "/portal-lider", module: "schedules", group: "Operações" },
  { icon: Key, label: "Aprovação PIX", path: "/pix-approvals", module: "users", group: "Admin" },
  { icon: Shield, label: "Ocorrências", path: "/admin/occurrences", module: "users", group: "Admin" },
  { icon: CreditCard, label: "Contas a Pagar", path: "/accounts-payable", module: "accounts_payable", group: "Financeiro" },
  { icon: Receipt, label: "Contas a Receber", path: "/accounts-receivable", module: "accounts_receivable", group: "Financeiro" },
  { icon: Wallet, label: "Lotes de Pagamento", path: "/payment-batches", module: "payment_batches", group: "Financeiro" },
  { icon: Shield, label: "Usuários", path: "/users", module: "users", group: "Admin" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const loginUrl = getLoginUrl();
  const oauthConfigured = isOAuthConfigured();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-20"></div>
              <div className="relative flex items-center gap-3 bg-card p-4 rounded-2xl border border-border/50">
                <CircleDollarSign className="h-10 w-10 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">FinHub</h1>
                  <p className="text-xs text-muted-foreground">Inteligente</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-4">
              Sistema de Gestão Financeira Premium. Faça login para acessar.
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Acesso restrito a e-mails corporativos ({COMPANY_EMAIL_DOMAINS_LABEL}).
            </p>
          </div>
          <Button
            onClick={() => {
              if (!oauthConfigured) return;
              window.location.href = loginUrl;
            }}
            size="lg"
            disabled={!oauthConfigured}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold h-12 rounded-lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Acessar Painel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar
        style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
        className="border-r border-border/50 bg-card/50 backdrop-blur-sm"
      >
        <SidebarHeader className="border-b border-border/50 bg-gradient-to-b from-card to-background/50">
          <div className="flex items-center gap-3 px-2 py-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                <CircleDollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-sm tracking-tight">FinHub</h2>
                <p className="text-xs text-muted-foreground">Inteligente</p>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          {Object.entries(
            allMenuItems.reduce((acc, item) => {
              if (!acc[item.group]) acc[item.group] = [];
              acc[item.group].push(item);
              return acc;
            }, {} as Record<string, MenuItem[]>)
          ).map(([group, items]) => (
            <div key={group} className="mb-6">
              <div className="px-3 py-2 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group}</p>
              </div>
              <SidebarMenu className="gap-1">
                {items.map((item) => (
                  <MenuItemComponent key={item.path} item={item} />
                ))}
              </SidebarMenu>
            </div>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-border/50 bg-gradient-to-t from-background to-card/50">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-12 px-3 hover:bg-accent/10 rounded-lg transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{user?.name || "Usuário"}</p>
                      <p className="text-xs text-muted-foreground">{user?.role === "admin" ? "Admin" : "Líder"}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border/50">
                  <DropdownMenuItem className="cursor-pointer hover:bg-accent/10">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    onClick={() => {
                      if (!oauthConfigured) return;
                      const logoutUrl = `${loginUrl}?logout=true`;
                      window.location.href = logoutUrl;
                    }}
                    className="cursor-pointer text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-gradient-to-br from-background via-background/95 to-background">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-40">
          <SidebarTrigger className="h-10 w-10 rounded-lg hover:bg-accent/10 transition-colors" />
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <main className="p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function MenuItemComponent({ item }: { item: MenuItem }) {
  const [location] = useLocation();
  const isActive = location === item.path;
  const Icon = item.icon;
  const { pendingCount } = item.path === "/pix-approvals" ? usePixNotifications() : { pendingCount: 0 };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={`rounded-lg transition-all ${
          isActive
            ? "bg-gradient-to-r from-primary/20 to-accent/20 text-primary font-semibold border-l-2 border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
        }`}
      >
        <a href={item.path} className="flex items-center gap-3 px-3 py-2.5">
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{item.label}</span>
          {item.path === "/pix-approvals" && pendingCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
