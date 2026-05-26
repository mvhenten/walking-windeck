import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { MapCanvas } from '../components/MapCanvas';
import { useSearch } from '../contexts/SearchContext';

export function SearchResultPage() {
  const [, params] = useRoute('/search/r/:id');
  const [, navigate] = useLocation();
  const { getResult } = useSearch();

  const id = params?.id;
  const result = id ? getResult(id) : undefined;

  if (!result) {
    return (
      <div className="h-full overflow-auto bg-background p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-center text-muted-foreground">Result not found.</p>
            <Button onClick={() => navigate('/search')} className="w-full">
              Back to search
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleShowOnMap = () => {
    navigate(`/?focus=${result.lat},${result.lng}&name=${encodeURIComponent(result.name)}`);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/search')}>
          ← Back
        </Button>
        <h1 className="truncate font-medium">{result.name}</h1>
      </div>

      <div className="relative h-64 shrink-0">
        <MapCanvas
          center={[result.lat, result.lng]}
          zoom={13}
          waypoints={[]}
          segments={[]}
          savedRoute={null}
          focusMarker={{ lat: result.lat, lng: result.lng, name: result.name }}
        />
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{result.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-sm text-muted-foreground">{result.fullName}</div>
            <div className="mb-1 text-xs text-muted-foreground">Type: {result.type}</div>
            <div className="mb-4 text-xs text-muted-foreground">
              {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
            </div>
            <Button onClick={handleShowOnMap} className="w-full">
              Show on map
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
