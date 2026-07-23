import { useAuth } from "@/_core/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useIsMobile } from "@/hooks/useMobile";
import {
  ArrowRightLeft,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calculator,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  FolderOpen,
  HeartPulse,
  Inbox,
  Kanban,
  LayoutDashboard,
  LogOut,
  Network,
  PanelLeft,
  Receipt,
  Settings,
  Shield,
  Smartphone,
  Stamp,
  Timer,
  TimerOff,
  UserCog,
  UserMinus,
  UserPlus,
  UserSearch,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type MenuItem = {
  icon: any;
  label: string;
  path: string;
  section?: string;
  requiredRoles?: Array<"admin" | "gestor" | "colaborador">;
};

const ADMIN_ONLY = ["admin"] as const;
const ADMIN_OR_MANAGER = ["admin", "gestor"] as const;

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", section: "Geral" },
  { icon: Inbox, label: "Caixa de entrada", path: "/inbox", section: "Geral" },
  { icon: ClipboardList, label: "Demandas", path: "/demandas", section: "Geral" },
  { icon: Users, label: "Funcionarios", path: "/funcionarios", section: "Geral", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: Briefcase, label: "Cargos e Funcoes", path: "/cargos", section: "Geral", requiredRoles: [...ADMIN_ONLY] },
  { icon: Building2, label: "Departamentos", path: "/departamentos", section: "Geral", requiredRoles: [...ADMIN_ONLY] },
  { icon: UserSearch, label: "Recrutamento", path: "/recrutamento", section: "Geral", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: Kanban, label: "Kanban", path: "/kanban-v2", section: "Geral" },
  { icon: UserPlus, label: "Admissao", path: "/admissao", section: "Geral", requiredRoles: [...ADMIN_ONLY] },
  { icon: UserMinus, label: "Desligamento", path: "/desligamento", section: "Geral", requiredRoles: [...ADMIN_ONLY] },

  { icon: Timer, label: "Bater Ponto", path: "/ponto", section: "Jornada" },
  { icon: Clock, label: "Banco de Horas", path: "/banco-horas", section: "Jornada" },
  { icon: TimerOff, label: "Horas Extras", path: "/horas-extras", section: "Jornada" },
  { icon: Stamp, label: "Jornada - Admin", path: "/jornada-admin", section: "Jornada", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: Smartphone, label: "App do Colaborador", path: "/app-colaborador-admin", section: "Jornada", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: Shield, label: "Compliance Portaria 671", path: "/compliance-jornada", section: "Jornada", requiredRoles: [...ADMIN_ONLY] },
  { icon: CalendarDays, label: "Ferias", path: "/ferias", section: "Jornada" },

  { icon: DollarSign, label: "Folha de Pagamento", path: "/folha", section: "Financeiro", requiredRoles: [...ADMIN_ONLY] },
  { icon: Receipt, label: "Holerite", path: "/holerite", section: "Financeiro" },
  { icon: Calculator, label: "Calculadoras CLT", path: "/calculadoras", section: "Financeiro" },

  { icon: HeartPulse, label: "Saude e Seguranca", path: "/saude", section: "Saude", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: ClipboardCheck, label: "Avaliacoes", path: "/avaliacoes", section: "Saude", requiredRoles: [...ADMIN_OR_MANAGER] },

  { icon: FolderOpen, label: "Dossie Digital", path: "/documentos", section: "Documentos", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: FileText, label: "Gerador de Docs", path: "/gerador", section: "Documentos", requiredRoles: [...ADMIN_ONLY] },

  { icon: BarChart3, label: "People Analytics", path: "/analytics", section: "Analise", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: FileText, label: "Relatorios", path: "/relatorios", section: "Analise", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: ClipboardList, label: "Relatorios Gerenciais", path: "/relatorios-gerenciais", section: "Analise", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: CalendarClock, label: "Rotinas Operacionais", path: "/rotinas-operacionais", section: "Analise", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: Shield, label: "Auditoria", path: "/auditoria", section: "Analise", requiredRoles: [...ADMIN_ONLY] },

  { icon: ArrowRightLeft, label: "Integracao", path: "/integracao", section: "Sistema", requiredRoles: [...ADMIN_ONLY] },
  { icon: Bell, label: "Notificacoes", path: "/notificacoes", section: "Sistema" },
  { icon: UserCog, label: "Usuarios", path: "/usuarios", section: "Sistema", requiredRoles: [...ADMIN_ONLY] },
  { icon: Network, label: "Hierarquia", path: "/hierarquia", section: "Sistema", requiredRoles: [...ADMIN_ONLY] },
  { icon: Shield, label: "Seguranca", path: "/seguranca-config", section: "Sistema", requiredRoles: [...ADMIN_ONLY] },
  { icon: Settings, label: "Configuracoes", path: "/configuracoes", section: "Sistema", requiredRoles: [...ADMIN_ONLY] },
  { icon: Shield, label: "Privacidade (LGPD)", path: "/privacidade", section: "Sistema" },
];

function filterByRole(items: MenuItem[], role: string | null | undefined): MenuItem[] {
  if (!role) return items.filter((item) => !item.requiredRoles);
  return items.filter((item) => !item.requiredRoles || item.requiredRoles.includes(role as any));
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex w-full max-w-md flex-col items-center gap-8 p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">
              RH Prime
            </h1>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              Sistema de Gestao de Recursos Humanos. Faca login para acessar o painel.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/login";
            }}
            size="lg"
            className="w-full shadow-lg transition-all hover:shadow-xl"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const visibleMenuItems = filterByRole(menuItems, (user as any)?.role);
  const activeMenuItem = visibleMenuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex w-full items-center gap-3 px-2 transition-all">
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-lg font-bold tracking-tight text-primary">
                    RH Prime
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            <SidebarMenu className="px-2 py-1">
              {(() => {
                let lastSection = "";
                return visibleMenuItems.map((item) => {
                  const isActive = location === item.path;
                  const showSection = item.section && item.section !== lastSection;
                  if (item.section) lastSection = item.section;

                  return (
                    <div key={item.path}>
                      {showSection && (
                        <div className="px-3 pb-1 pt-4 group-data-[collapsible=icon]:hidden">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                            {item.section}
                          </span>
                        </div>
                      )}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 text-[13px] font-normal transition-all"
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </div>
                  );
                });
              })()}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group-data-[collapsible=icon]:justify-center flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 shrink-0 border">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20 ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <div className="supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-2 backdrop-blur">
          <div className="flex items-center gap-2">
            {isMobile ? <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" /> : null}
            <span className="text-sm tracking-tight text-foreground md:text-base">
              {activeMenuItem?.label ?? "Menu"}
            </span>
          </div>
          <div className="flex items-center gap-1 pr-2">
            <NotificationBell />
          </div>
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
