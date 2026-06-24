import { useAuth } from "@/_core/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  LayoutDashboard,
  Inbox,
  LogOut,
  PanelLeft,
  Users,
  Briefcase,
  Building2,
  CalendarDays,
  HeartPulse,
  Clock,
  FolderOpen,
  FileText,
  ArrowRightLeft,
  Bell,
  Settings,
  Shield,
  Timer,
  DollarSign,
  Receipt,
  Calculator,
  Stamp,
  BarChart3,
  UserSearch,
  UserPlus,
  UserMinus,
  ClipboardCheck,
  TimerOff,
  Kanban,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

type MenuItem = {
  icon: any;
  label: string;
  path: string;
  section?: string;
  /** Se omitido, visível para todos os logados. */
  requiredRoles?: Array<"admin" | "gestor" | "colaborador">;
};

const ADMIN_ONLY = ["admin"] as const;
const ADMIN_OR_MANAGER = ["admin", "gestor"] as const;

const menuItems: MenuItem[] = [
  // Geral
  { icon: LayoutDashboard, label: "Dashboard", path: "/", section: "Geral" },
  { icon: Inbox, label: "Caixa de entrada", path: "/inbox", section: "Geral" },
  { icon: Users, label: "Funcionários", path: "/funcionarios", section: "Geral", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: Briefcase, label: "Cargos e Funções", path: "/cargos", section: "Geral", requiredRoles: [...ADMIN_ONLY] },
  { icon: Building2, label: "Departamentos", path: "/departamentos", section: "Geral", requiredRoles: [...ADMIN_ONLY] },
  { icon: UserSearch, label: "Recrutamento", path: "/recrutamento", section: "Geral", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: Kanban, label: "Kanban", path: "/kanban-v2", section: "Geral" },
  { icon: UserPlus, label: "Admissão", path: "/admissao", section: "Geral", requiredRoles: [...ADMIN_ONLY] },
  { icon: UserMinus, label: "Desligamento", path: "/desligamento", section: "Geral", requiredRoles: [...ADMIN_ONLY] },
  // Jornada
  { icon: Timer, label: "Bater Ponto", path: "/ponto", section: "Jornada" },
  { icon: Clock, label: "Banco de Horas", path: "/banco-horas", section: "Jornada" },
  { icon: TimerOff, label: "Horas Extras", path: "/horas-extras", section: "Jornada" },
  { icon: Stamp, label: "Jornada — Admin", path: "/jornada-admin", section: "Jornada", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: Shield, label: "Compliance Portaria 671", path: "/compliance-jornada", section: "Jornada", requiredRoles: [...ADMIN_ONLY] },
  { icon: CalendarDays, label: "Férias", path: "/ferias", section: "Jornada" },
  // Financeiro
  { icon: DollarSign, label: "Folha de Pagamento", path: "/folha", section: "Financeiro", requiredRoles: [...ADMIN_ONLY] },
  { icon: Receipt, label: "Holerite", path: "/holerite", section: "Financeiro" },
  { icon: Calculator, label: "Calculadoras CLT", path: "/calculadoras", section: "Financeiro" },
  // Saúde e Segurança
  { icon: HeartPulse, label: "Saúde e Segurança", path: "/saude", section: "Saúde", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: ClipboardCheck, label: "Avaliações", path: "/avaliacoes", section: "Saúde", requiredRoles: [...ADMIN_OR_MANAGER] },
  // Documentos
  { icon: FolderOpen, label: "Dossiê Digital", path: "/documentos", section: "Documentos", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: FileText, label: "Gerador de Docs", path: "/gerador", section: "Documentos", requiredRoles: [...ADMIN_ONLY] },
  // Análise
  { icon: BarChart3, label: "People Analytics", path: "/analytics", section: "Análise", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: FileText, label: "Relatórios", path: "/relatorios", section: "Análise", requiredRoles: [...ADMIN_OR_MANAGER] },
  { icon: Shield, label: "Auditoria", path: "/auditoria", section: "Análise", requiredRoles: [...ADMIN_ONLY] },
  // Sistema
  { icon: ArrowRightLeft, label: "Integração", path: "/integracao", section: "Sistema", requiredRoles: [...ADMIN_ONLY] },
  { icon: Bell, label: "Notificações", path: "/notificacoes", section: "Sistema" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", section: "Sistema", requiredRoles: [...ADMIN_ONLY] },
  { icon: Shield, label: "Privacidade (LGPD)", path: "/privacidade", section: "Sistema" },
];

function filterByRole(items: MenuItem[], role: string | null | undefined): MenuItem[] {
  if (!role) return items.filter((i) => !i.requiredRoles);
  return items.filter((i) => !i.requiredRoles || i.requiredRoles.includes(role as any));
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-center text-foreground">
              RH Prime
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Sistema de Gestão de Recursos Humanos. Faça login para acessar o
              painel.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/login";
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
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
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
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
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold tracking-tight truncate text-primary text-lg">
                    RH Prime
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            <SidebarMenu className="px-2 py-1">
              {(() => {
                let lastSection = '';
                return visibleMenuItems.map((item) => {
                  const isActive = location === item.path;
                  const showSection = item.section && item.section !== lastSection;
                  if (item.section) lastSection = item.section;
                  return (
                    <div key={item.path}>
                      {showSection && (
                        <div className="px-3 pt-4 pb-1 group-data-[collapsible=icon]:hidden">
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
                          className={`h-9 transition-all font-normal text-[13px]`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
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
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
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
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />}
            <span className="tracking-tight text-foreground text-sm md:text-base">
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
