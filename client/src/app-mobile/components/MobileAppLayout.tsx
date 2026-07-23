import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Clock3, House, Shield } from "lucide-react";

type MobileAppLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const navItems = [
  { href: "/app", label: "Inicio", icon: House },
  { href: "/app/ponto", label: "Ponto", icon: Clock3 },
  { href: "/privacidade", label: "Privacidade", icon: Shield },
];

export function MobileAppLayout({ title, subtitle, children }: MobileAppLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-950">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 pb-4 pt-5 backdrop-blur supports-[padding:max(0px)]:pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/painel" className="inline-flex items-center gap-2 text-sm text-slate-300">
              <ChevronLeft className="h-4 w-4" />
              Voltar ao sistema
            </Link>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
              app colaborador
            </span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-5">{children}</main>

        <nav className="sticky bottom-0 border-t border-slate-800 bg-slate-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-slate-900 text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
