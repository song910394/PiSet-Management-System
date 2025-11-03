import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Dashboard from "@/pages/dashboard";
import Materials from "@/pages/materials";
import Recipes from "@/pages/recipes";
import Products from "@/pages/products";
import CustomProducts from "@/pages/custom-products";
import Packaging from "@/pages/packaging";
import Nutrition from "@/pages/nutrition";
import NutritionTables from "@/pages/nutrition-tables";
import NutritionLabelsPage from "@/pages/nutrition-labels";
import Backup from "@/pages/backup-new";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/materials" component={Materials} />
            <Route path="/recipes" component={Recipes} />
            <Route path="/products" component={Products} />
            <Route path="/custom-products" component={CustomProducts} />
            <Route path="/packaging" component={Packaging} />
            <Route path="/nutrition" component={Nutrition} />
            <Route path="/nutrition-tables" component={NutritionTables} />
            <Route path="/nutrition-labels" component={NutritionLabelsPage} />
            <Route path="/backup" component={Backup} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const [location, setLocation] = useLocation();
  const { data: authStatus, isLoading } = useQuery({
    queryKey: ["/api/auth/check"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!(authStatus as any)?.authenticated) {
    return <Login />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
