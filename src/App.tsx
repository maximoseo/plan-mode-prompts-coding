import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Templates = lazy(() => import("./pages/Templates"));
const Playground = lazy(() => import("./pages/Playground"));
const Builder = lazy(() => import("./pages/Builder"));
const History = lazy(() => import("./pages/History"));
const Websites = lazy(() => import("./pages/Websites"));
const Improve = lazy(() => import("./pages/Improve"));
const Swarm = lazy(() => import("./pages/Swarm"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AICodingGenerator = lazy(() => import("./pages/AICodingGenerator"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/websites" element={<Websites />} />
                  <Route path="/ai-coding-generator" element={<AICodingGenerator />} />
                  <Route path="/improve" element={<Improve />} />
                  <Route path="/swarm" element={<Swarm />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/templates/new" element={<Builder />} />
                  <Route path="/templates/:id" element={<Builder />} />
                  <Route path="/playground" element={<Playground />} />
                  <Route path="/history" element={<History />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
