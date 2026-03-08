import { Switch, Route, useLocation } from "wouter";
import OfflineBanner from "@/components/OfflineBanner";
import OfflineIndicator from "@/components/OfflineIndicator";

import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { StoreProvider } from "@/context/store-context";
import { ThemeProvider } from "@/components/theme-provider";

import { useAuth } from "@/hooks/use-auth";

import NotFound from "@/pages/not-found";
import ShoppingList from "@/pages/shopping-list";
import Database from "@/pages/database";
import Login from "@/pages/login";


function AppInner() {
  const { data: auth, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth) {
    return <Login onSuccess={() => setLocation("/")} />;
  }

  return (
    <StoreProvider>
      <Layout auth={auth}>
        <Switch>
          <Route path="/" component={ShoppingList} />
          <Route path="/database" component={Database} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </StoreProvider>
  );
}


function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>

          <OfflineBanner />
          <OfflineIndicator />

          <Toaster />

          <AppInner />

        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
