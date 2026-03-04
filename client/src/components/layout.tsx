import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { ListChecks, Database, Users, LogOut, ChevronDown, UserCircle2, Plus, Loader2, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/hooks/use-realtime";
import { useLogout, useSwitchUser, useAddMember, useDeleteMember } from "@/hooks/use-auth";
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

function MemberMenu({ auth }: { auth: AuthState }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const switchMutation = useSwitchUser();
  const addMutation = useAddMember();
  const deleteMutation = useDeleteMember();
  const logoutMutation = useLogout();
  const { toast } = useToast();

  const activeUser = auth.users.find(u => u.id === auth.activeUserId);

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
                onClick={() => switchMutation.mutate(user.id)}
                data-testid={`button-switch-user-${user.id}`}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  user.id === auth.activeUserId
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {user.id === auth.activeUserId
                    ? <Check className="w-3 h-3" />
                    : user.name[0].toUpperCase()
                  }
                </div>
                <span className={user.id === auth.activeUserId ? "font-semibold" : ""}>{user.name}</span>
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
  const [location] = useLocation();
  const [onlineCount, setOnlineCount] = useState(1);

  const handlePresenceChange = useCallback((count: number) => {
    setOnlineCount(count);
  }, []);

  useRealtime(handlePresenceChange);

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
              Shope<span className="text-muted-foreground font-normal">eze</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
              data-testid="online-indicator"
              title={`${onlineCount} ${onlineCount === 1 ? "person" : "people"} online`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <Users className="w-4 h-4" />
              <span className="tabular-nums font-medium text-foreground">{onlineCount}</span>
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

            <MemberMenu auth={auth} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
