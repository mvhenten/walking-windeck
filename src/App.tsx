import { Router, Route, Switch } from 'wouter';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { TrackerProvider } from './contexts/TrackerContext';
import { SearchProvider } from './contexts/SearchContext';
import { MapPage } from './routes/MapPage';
import { RoutesPage } from './routes/RoutesPage';
import { SettingsPage } from './routes/SettingsPage';
import { SearchPage } from './routes/SearchPage';
import { SearchResultPage } from './routes/SearchResultPage';

export function App() {
  // Get base path for wouter
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <Router base={basePath}>
      <TrackerProvider>
        <SearchProvider>
          <AppShell>
            <Switch>
              <Route path="/" component={MapPage} />
              <Route path="/search" component={SearchPage} />
              <Route path="/search/r/:id" component={SearchResultPage} />
              <Route path="/routes" component={RoutesPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route>404 - Not Found</Route>
            </Switch>
          </AppShell>
        </SearchProvider>
        <Toaster
          position="top-center"
          theme="dark"
          duration={Infinity}
          closeButton
          expand
          visibleToasts={5}
        />
      </TrackerProvider>
    </Router>
  );
}
