import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { StoreProvider } from "@/context/store-context";

import NotFound from "@/pages/not-found";
import ShoppingList from "@/pages/shopping-list";
import Database from "@/pages/database";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={ShoppingList} />
        <Route path="/database" component={Database} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <Toaster />
          <Router />
        </StoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
