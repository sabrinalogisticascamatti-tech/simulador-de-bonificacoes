import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Funcionarios from "./pages/Funcionarios";
import Regras from "./pages/Regras";
import Simulacoes from "./pages/Simulacoes";
import SimulacaoDetalhes from "./pages/SimulacaoDetalhes";
import NovaSimulacao from "./pages/NovaSimulacao";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/funcionarios"} component={Funcionarios} />
      <Route path={"/regras"} component={Regras} />
      <Route path={"/simulacoes"} component={Simulacoes} />
      <Route path={"/simulacoes/nova"} component={NovaSimulacao} />
      <Route path={"/simulacoes/:id"} component={SimulacaoDetalhes} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
