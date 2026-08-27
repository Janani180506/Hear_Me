import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home,
  Hand,
  Type,
  Siren,
  User,
  Settings as SettingsIcon,
  Menu,
  X,
  LayoutGrid,
  Users,
} from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/sign-to-text", label: "Sign to Text", icon: Hand },
  { to: "/text-to-sign", label: "Text to Sign", icon: Type },
  { to: "/communication-board", label: "TouchSpeak Board", icon: LayoutGrid },
  { to: "/caregiver", label: "Caregiver", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full gradient-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full gradient-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SignConnect — Bridging Sign Language & Speech" },
      {
        name: "description",
        content:
          "SignConnect: real-time AI communication for deaf, mute and hearing individuals. Sign-to-text, text-to-sign avatar, and emergency SOS.",
      },
      { property: "og:title", content: "SignConnect — AI Communication" },
      {
        property: "og:description",
        content:
          "Real-time sign language recognition, text-to-sign avatar and emergency SOS for inclusive communication.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <base href="/" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-full flex-col gap-2 p-4">
      <div className="mb-6 flex items-center justify-between gap-2 px-2">
        <Link to="/" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl gradient-primary shadow-glow">
            <Hand className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-bold leading-none">HearMe</div>
            <div className="text-xs text-muted-foreground">Communication Platform</div>
          </div>
        </Link>
        <ThemeToggle />
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            activeOptions={{ exact: to === "/" }}
            activeProps={{
              className:
                "gradient-primary text-primary-foreground shadow-card",
            }}
            inactiveProps={{
              className:
                "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground",
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl glass p-4">
        <div className="text-xs font-semibold text-primary">Need help?</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Use Emergency Help on the TouchSpeak Board for immediate assistance.
        </p>
        <Link
          to="/communication-board"
          onClick={onNavigate}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground"
        >
          TouchSpeak Board
        </Link>
      </div>
    </aside>
  );
}

function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-72 lg:border-r lg:bg-sidebar">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
            <Hand className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-bold">SignConnect</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border bg-card"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-sidebar shadow-elevated animate-fade-up">
            <div className="flex justify-end p-2">
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-sidebar-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-72">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
