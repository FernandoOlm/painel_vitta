import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Building2,
  HardHat,
  FileText,
  FilePlus2,
  Contact2,
  ShieldCheck,
  UserPlus,
  LogOut,
  Menu,
  Megaphone,
  Send,
  QrCode,
  Stethoscope,
  ClipboardList,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/contatos", label: "Contatos", icon: Contact2 },
  { to: "/empresas", label: "Clientes (Empresas)", icon: Building2 },
  { to: "/trabalhadores", label: "Pacientes", icon: HardHat },
  { to: "/exames", label: "Exames", icon: Stethoscope },
  { to: "/exames/catalogo", label: "Catálogo de exames", icon: ListChecks },
  { to: "/laudos", label: "Laudos", icon: FileText },
  { to: "/laudos/novo", label: "Novo laudo", icon: FilePlus2 },
  { to: "/plano-acoes", label: "Plano de Ações", icon: ClipboardList },
  { to: "/campanhas", label: "Campanhas WhatsApp", icon: Megaphone },
  { to: "/campanhas/nova", label: "Nova campanha", icon: Send },
  { to: "/conectar-bot", label: "Conectar Bot (QR Code)", icon: QrCode },
];

const STORAGE_KEY = "vitta:sidebar-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut, isAdminOrDev } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const navItems = [
    ...nav,
    ...(isAdminOrDev
      ? [
          { to: "/usuarios", label: "Usuários", icon: ShieldCheck },
          { to: "/usuarios/novo", label: "Criar usuário", icon: UserPlus },
        ]
      : []),
  ];

  const bestMatch = [...navItems]
    .filter((n) => pathname === n.to || pathname.startsWith(n.to + "/"))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200 lg:translate-x-0 lg:static",
            collapsed ? "w-64 lg:w-[4.5rem]" : "w-64",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="px-4 py-5 border-b border-sidebar-border flex items-center gap-2">
            <div className="size-9 shrink-0 rounded-md bg-sidebar-primary grid place-items-center font-bold text-sidebar-primary-foreground">
              V
            </div>
            <div className={cn("min-w-0", collapsed && "lg:hidden")}>
              <div className="font-display font-bold leading-tight truncate">Vitta SST</div>
              <div className="text-xs opacity-70 truncate">Engenharia em segurança</div>
            </div>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = bestMatch?.to === item.to;
              const link = (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  aria-label={item.label}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    collapsed && "lg:justify-center lg:px-2",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
                </Link>
              );
              if (!collapsed) return link;
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="hidden lg:block">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          <div className="px-2 py-3 border-t border-sidebar-border space-y-2">
            <div className={cn("px-3 text-xs opacity-70 truncate", collapsed && "lg:hidden")}>{user?.email}</div>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "lg:justify-center lg:px-0",
              )}
              onClick={signOut}
            >
              <LogOut className={cn("size-4", !collapsed && "mr-2")} />
              <span className={cn(collapsed && "lg:hidden")}>Sair</span>
            </Button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {open && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card flex items-center px-4 lg:px-6 gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:inline-flex"
                  onClick={toggleCollapsed}
                  aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
                >
                  {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{collapsed ? "Expandir menu" : "Recolher menu"}</TooltipContent>
            </Tooltip>
            <div className="font-display font-semibold truncate">{bestMatch?.label ?? "Vitta SST"}</div>
          </header>
          <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
