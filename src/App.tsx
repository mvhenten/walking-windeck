import { Router, Route, Switch } from 'wouter';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { MapPage } from './routes/MapPage';
import { RoutesPage } from './routes/RoutesPage';
import { SettingsPage } from './routes/SettingsPage';
import { useAuth } from './hooks/useAuth';

export function App() {
  const { authenticated } = useAuth();

  // Get base path for wouter
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <Router base={basePath}>
      <AppShell authenticated={authenticated}>
        <Switch>
          <Route path="/" component={MapPage} />
          <Route path="/routes" component={RoutesPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route>404 - Not Found</Route>
        </Switch>
      </AppShell>
      <Toaster position="top-center" theme="dark" />
    </Router>
  );
}
