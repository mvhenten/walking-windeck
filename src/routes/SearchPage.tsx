import { useEffect, useRef, useState, ChangeEvent, UIEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { searchPlaces } from '../lib/geocode';
import { useSearch } from '../contexts/SearchContext';

export function SearchPage() {
  const { query, results, scrollY, setQuery, setResults, setScrollY } = useSearch();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current && scrollY > 0) {
      scrollRef.current.scrollTop = scrollY;
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async (q: string) => {
    if (abortRef.current) abortRef.current.abort();

    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const arr = await searchPlaces(q, controller.signal);
      if (controller.signal.aborted) return;
      setResults(arr);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(next);
    }, 400);
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  };

  const trimmed = query.trim();

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Close search">
          ×
        </Button>
        <Input
          type="search"
          autoFocus
          value={query}
          onChange={handleChange}
          placeholder="Search places…"
        />
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto p-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Searching…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : trimmed.length < 2 ? (
          <p className="text-sm text-muted-foreground">Type at least 2 characters.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches.</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <Link key={r.id} href={`/search/r/${r.id}`}>
                <Card className="cursor-pointer">
                  <CardContent className="p-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">{r.fullName}</div>
                    <div className="text-xs text-muted-foreground">{r.type}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              via OpenStreetMap Nominatim
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
