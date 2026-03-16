import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { ListChecks, Database, Users, LogOut, ChevronDown, UserCircle2, Plus, Loader2, Check, Trash2, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/hooks/use-realtime";
import { useLogout, useSwitchUser, useAddMember, useDeleteMember } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import type { AuthState } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useStoreContext } from "@/context/store-context";
import { pwaCheckRef } from "@/components/pwa-update";

function MemberMenu({ auth }: { auth: AuthState }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const switchMutation = useSwitchUser();
  const addMutation = useAddMember();
  const deleteMutation = useDeleteMember();
  const logoutMutation = useLogout();
  const { toast } = useToast();

  const activeUser = auth.users.find(u => Number(u.id) === Number(auth.activeUserId));

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addMutation.mutateAsync(newName.trim());
      setNewName("");
      setShowAddForm(false);
    } catch (err: any) {
      toast({ title: "Failed to add member", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="button-user-menu"
        >
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
            <UserCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden sm:flex flex-col items-start leading-none">
            <span className="font-semibold text-xs text-foreground">{activeUser?.name ?? "Select member"}</span>
            <span className="text-xs text-muted-foreground">{auth.account.name}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border-border/50 p-1">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">
          Account: <span className="font-semibold text-foreground">{auth.account.name}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-1 pb-1">
          <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Members</p>
          {auth.users.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/60 group"
            >
              <button
                className="flex items-center gap-2 flex-1 text-left text-sm"
                onClick={() => switchMutation.mutate(Number(user.id))}
                data-testid={`button-switch-user-${user.id}`}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  Number(user.id) === Number(auth.activeUserId)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {Number(user.id) === Number(auth.activeUserId)
                    ? <Check className="w-3 h-3" />
                    : user.name[0].toUpperCase()
                  }
                </div>
                <span className={Number(user.id) === Number(auth.activeUserId) ? "font-semibold" : ""}>{user.name}</span>
              </button>
              {auth.users.length > 1 && (
                <button
                  onClick={() => deleteMutation.mutate(user.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  data-testid={`button-delete-user-${user.id}`}
                >
                  {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              )}
            </div>
          ))}
        </div>

        {auth.users.length < 6 && (
          <>
            <DropdownMenuSeparator />
            {showAddForm ? (
              <div className="px-2 py-1.5 space-y-2">
                <Input
                  placeholder="Member name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  autoFocus
                  className="h-8 text-sm bg-secondary/50 border-transparent"
                  data-testid="input-new-member"
                />
                <div className="flex gap-1">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAdd} disabled={addMutation.isPending}>
                    {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddForm(false); setNewName(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <DropdownMenuItem
                onClick={(e) => { e.preventDefault(); setShowAddForm(true); }}
                className="rounded-lg text-sm cursor-pointer"
                data-testid="button-add-member"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add member
                <span className="ml-auto text-xs text-muted-foreground">{auth.users.length}/6</span>
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logoutMutation.mutate()}
          className="rounded-lg text-sm text-destructive hover:!text-destructive cursor-pointer"
          data-testid="button-logout"
        >
          {logoutMutation.isPending
            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            : <LogOut className="w-4 h-4 mr-2" />}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Layout({ children, auth }: { children: React.ReactNode; auth: AuthState }) {
  const [location, setLocation] = useLocation();
  const [onlineCount, setOnlineCount] = useState(1);
  const { toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { addStore } = useStoreContext();
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const { sortByAisle, setSortByAisle } = useStoreContext();

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "latest">("idle");

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus("idle");
    await pwaCheckRef.check();
    // Give the service worker a moment to activate and reload.
    // If a new version was found, controllerchange fires and
    // reloads automatically. If not, show "Up to date" after 3s.
    setTimeout(() => {
      setCheckingUpdate(false);
      setUpdateStatus("latest");
    }, 3000);
  };

  const handlePresenceChange = useCallback((count: number) => {
    setOnlineCount(count);
  }, []);

  useRealtime(handlePresenceChange);

  const navItems = [
    { href: "/", label: "Lists", icon: "📋" },
    { href: "/database", label: "Database", icon: "🗄" },
  ];

  const navigate = (path: string) => {
    setLocation(path);
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 sm:h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="text-xl p-2"
            >
              ☰
            </button>

            <h1 className="text-xl font-bold tracking-tight font-display">
              <span className="text-primary">Shop</span>
              <span className="text-muted-foreground font-normal">eeze</span>
            </h1>

            <div className="flex items-center gap-1 ml-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    location === item.href
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>

          </div>

          <MemberMenu auth={auth} />

        </div>
      </header>

     {/* Drawer */}
{drawerOpen && (
  <div className="fixed inset-0 z-50">

    {/* Overlay */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => setDrawerOpen(false)}
    />

    {/* Drawer panel */}
    <div className="absolute left-0 top-0 h-full w-72 bg-background border-r border-border shadow-2xl p-6 flex flex-col animate-in slide-in-from-left duration-300">

      {/* App title */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold">
          Shopeeze
        </h2>
        <p className="text-xs text-muted-foreground">
          Smart shopping lists
        </p>
      </div>

      {/* Navigation */}
      <div className="space-y-1">

        <p className="text-xs uppercase text-muted-foreground mb-2">
          Navigation
        </p>

        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors",
              location === item.href
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}

      </div>

      {/* Divider */}
      <div className="border-t border-border my-6" />

      {/* App tools */}
      <div className="space-y-2">

        <p className="text-xs uppercase text-muted-foreground mb-2">
  Settings
</p>
{/* ADD STORE */}

{showAddStore ? (

  <div className="space-y-2 px-3 py-2">

    <Input
      placeholder="Store name"
      value={newStoreName}
      onChange={(e) => setNewStoreName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && newStoreName.trim()) {
          addStore(newStoreName.trim());
          setNewStoreName("");
          setShowAddStore(false);
        }
      }}
      className="h-8 text-sm"
    />

    <div className="flex gap-2">

      <Button
        size="sm"
        className="flex-1 h-7 text-xs"
        onClick={() => {
          if (!newStoreName.trim()) return;
          addStore(newStoreName.trim());
          setNewStoreName("");
          setShowAddStore(false);
        }}
      >
        Add Store
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
        onClick={() => {
          setShowAddStore(false);
          setNewStoreName("");
        }}
      >
        Cancel
      </Button>

    </div>

  </div>

) : (

  <button
    onClick={() => setShowAddStore(true)}
    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-secondary text-sm"
  >
    🏪 Add Store
  </button>

)}
<button
  onClick={() => {
    toggleTheme();
    setDrawerOpen(false);
  }}
  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-secondary text-sm"
>
  🌙 Toggle Theme
</button>

<button
  onClick={() => setSortByAisle(!sortByAisle)}
  className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-secondary text-sm"
>
  <span>🛒 Sort by aisle</span>
  <span>{sortByAisle ? "✓" : ""}</span>
</button>


        <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
          🟢 {onlineCount} users online
        </div>

        <button
          onClick={handleCheckUpdate}
          disabled={checkingUpdate}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-secondary text-sm disabled:opacity-50"
        >
          {checkingUpdate
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
            : updateStatus === "latest"
            ? <>✓ Up to date</>
            : <>🔄 Check for updates</>}
        </button>

      </div>

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Footer */}
      <div className="text-xs text-muted-foreground">
        Shopeeze v1.50
      </div>

    </div>

  </div>
)}

      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 lg:p-8">
        {children}
      </main>

    </div>
  );
}