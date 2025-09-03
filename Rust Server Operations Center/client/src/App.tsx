import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/error-boundary";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import ServersPage from "@/pages/servers";
import MapViewer from "@/pages/map-viewer";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="min-h-[calc(100vh-4rem)]">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/servers" component={ServersPage} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/map-viewer" component={MapViewer} />
          <Route path="/landing" component={Landing} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
