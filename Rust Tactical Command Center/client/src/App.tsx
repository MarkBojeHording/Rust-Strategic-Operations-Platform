import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import TacticalMap from "@/pages/tactical-map";
import IconDemo from "@/pages/icon-demo";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import { useAuth } from "@/hooks/useAuth";

function AuthenticatedRouter() {
  // const { user, isLoading, isAuthenticated } = useAuth();

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-gray-900 flex items-center justify-center">
  //       <div className="text-white text-xl">Loading...</div>
  //     </div>
  //   );
  // }

  return (
    <Switch>
      <Route path="/" component={TacticalMap} />
      <Route path="/tactical-map" component={TacticalMap} />
      <Route path="/icon-demo" component={IconDemo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthenticatedRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;