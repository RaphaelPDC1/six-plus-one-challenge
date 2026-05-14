import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Register from "./pages/Register";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/register"} component={Register} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Applies data-theme="day" between 06:00–18:00 local time, else "night".
 *  Rechecks every minute so the transition happens automatically. */
function useTimeBasedTheme() {
  useEffect(() => {
    const apply = () => {
      const h = new Date().getHours();
      document.documentElement.dataset.theme = h >= 6 && h < 18 ? "day" : "night";
    };
    apply();
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, []);
}

function App() {
  useTimeBasedTheme();
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
