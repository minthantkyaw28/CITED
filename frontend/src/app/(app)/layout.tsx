import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="relative flex-1 p-4 sm:p-6 lg:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            aria-hidden
          >
            <div className="mesh-bg absolute inset-0" />
            <div className="grid-bg absolute inset-0" />
          </div>
          <div className="relative z-10 mx-auto max-w-7xl">{children}</div>
          <footer className="relative z-10 mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 font-mono text-[10px] text-muted-foreground">
            CITED demo · Graph projection styled after{" "}
            <span className="text-foreground/90">Neo4j</span> property graphs · Long-running
            agents simulated via <span className="text-foreground/90">Kimchi</span> ·
            Optimization modules presented as{" "}
            <span className="text-foreground/90">Tessl</span> Skills. No production integrations.
          </footer>
        </main>
      </div>
    </div>
  );
}
