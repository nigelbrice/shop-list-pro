import { useState } from "react";
import { ListChecks, Eye, EyeOff, Loader2, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useRegister } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [accountName, setAccountName] = useState("");
  const [password, setPassword] = useState("");
  const [userName, setUserName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const { toast } = useToast();

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tab === "login") {
        await loginMutation.mutateAsync({ accountName, password });
      } else {
        await registerMutation.mutateAsync({ accountName, password, userName });
      }
      onSuccess();
    } catch (err: any) {
      toast({
        title: tab === "login" ? "Login failed" : "Registration failed",
        description: err?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-2">
            <ListChecks className="w-9 h-9" />
          </div>
          <h1 className="text-4xl font-bold font-display text-foreground">
            <span className="text-primary">Shop</span><span className="text-muted-foreground font-normal">eeze</span>
          </h1>
          <p className="text-muted-foreground text-base">
            {tab === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
          <div className="flex border-b border-border/50">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                data-testid={`tab-${t}`}
                className={cn(
                  "flex-1 py-3.5 text-sm font-semibold transition-all duration-200",
                  tab === t
                    ? "bg-primary/8 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="accountName" className="text-sm font-medium">
                Account name
              </Label>
              <Input
                id="accountName"
                placeholder="e.g. Smith Family"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                autoComplete="username"
                required
                data-testid="input-account-name"
                className="bg-secondary/50 border-transparent focus-visible:border-primary h-11"
              />
            </div>

            {tab === "register" && (
              <div className="space-y-2">
                <Label htmlFor="userName" className="text-sm font-medium">
                  Your name
                </Label>
                <Input
                  id="userName"
                  placeholder="e.g. Alice"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  required
                  data-testid="input-user-name"
                  className="bg-secondary/50 border-transparent focus-visible:border-primary h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Up to 5 additional members can be added after creating your account.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={tab === "register" ? "At least 6 characters" : "Your password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  required
                  data-testid="input-password"
                  className="bg-secondary/50 border-transparent focus-visible:border-primary h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={isPending}
              data-testid="button-submit-auth"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : tab === "login" ? (
                <><LogIn className="w-4 h-4 mr-2" />Sign In</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" />Create Account</>
              )}
            </Button>

            {tab === "login" && (
              <p className="text-center text-xs text-muted-foreground">
                Don't have an account?{" "}
                <button type="button" onClick={() => setTab("register")} className="text-primary hover:underline font-medium">
                  Create one
                </button>
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          If you were using Shopeeze before login was added, sign in with account name{" "}
          <strong>Demo</strong> and password <strong>demo123</strong>.
        </p>
      </div>
    </div>
  );
}
