import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const savedAuth = localStorage.getItem('tradesync_auth');
    if (savedAuth === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (password: string) => {
    // Store authentication state
    localStorage.setItem('tradesync_auth', 'authenticated');
    localStorage.setItem('tradesync_session', Date.now().toString());
    // Clear the pre-alpha warning flag so it shows again on login
    localStorage.removeItem('preAlphaWarningShown');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('tradesync_auth');
    localStorage.removeItem('tradesync_session');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Switch>
      <Route path="/" component={() => <Dashboard onLogout={handleLogout} />} />
      <Route component={NotFound} />
    </Switch>
  );
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
