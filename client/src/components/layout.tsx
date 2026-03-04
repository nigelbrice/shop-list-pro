import { Link, useLocation } from "wouter";
import { ListChecks, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Shopping List", icon: ListChecks },
    { href: "/database", label: "Item Database", icon: Database },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <ListChecks className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-display">
              Cart<span className="text-muted-foreground font-normal">Minimal</span>
            </h1>
          </div>
          
          <nav className="flex items-center gap-1 sm:gap-2 bg-secondary/50 p-1 rounded-xl">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 focus-ring",
                    isActive
                      ? "bg-background text-foreground shadow-sm shadow-black/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
