import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useStore } from '../hooks/useStore';
import { RouteMetadata, SavedRoute } from '../types';
import { formatDistance } from '../lib/stats';
import { MapCanvas } from '../components/MapCanvas';

export function RoutesPage() {
  const [routes, setRoutes] = useState<RouteMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<SavedRoute | null>(null);
  const [, navigate] = useLocation();

  const store = useStore();

  useEffect(() => {
    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const list = await store.list();
      setRoutes(list);
    } catch (e) {
      toast.error(`Failed to load routes: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShow = async (id: string) => {
    try {
      const route = await store.get(id);
      if (!route) {
        toast.error('Route not found');
        return;
      }
      setSelectedRoute(route);
    } catch (e) {
      toast.error(`Failed to load route: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const route = await store.get(id);
      if (!route || !confirm(`Delete "${route.name}"?`)) return;

      await store.delete(id);
      if (selectedRoute?.id === id) {
        setSelectedRoute(null);
      }
      await loadRoutes();
    } catch (e) {
      toast.error(`Failed to delete: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  if (selectedRoute) {
    return (
      <div className="relative h-full">
        <MapCanvas
          center={[selectedRoute.coords[0]?.[0] ?? 50.7826, selectedRoute.coords[0]?.[1] ?? 7.6566]}
          zoom={14}
          waypoints={[]}
          segments={[]}
          savedRoute={selectedRoute.coords.map((c) => [c[0], c[1]])}
          savedRouteKind={selectedRoute.kind ?? 'drawn'}
        />
        <div className="absolute top-20 left-3 right-3 z-[1000]">
          <Card>
            <CardHeader>
              <CardTitle>{selectedRoute.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm">
                {formatDistance(selectedRoute.stats.dist)} · ↑{' '}
                {Math.round(selectedRoute.stats.ascent)} m · ↓{' '}
                {Math.round(selectedRoute.stats.descent)} m
              </div>
              <Button onClick={() => setSelectedRoute(null)} variant="outline">
                Back to list
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background p-4">
      <h1 className="mb-6 text-2xl font-bold">Saved Routes</h1>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : routes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-center text-muted-foreground">No saved routes yet.</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Draw your first route
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <Card key={route.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{route.name}</CardTitle>
                  <span className="text-xs rounded-full px-2 py-1 bg-accent text-accent-foreground whitespace-nowrap">
                    {(route as { kind?: string }).kind === 'tracked' ? '🚶 tracked' : '✏ drawn'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 text-xs text-muted-foreground">
                  {new Date(route.created).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleShow(route.id)}>
                    Show on map
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(route.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
