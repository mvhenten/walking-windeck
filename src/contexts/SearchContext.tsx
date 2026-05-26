import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { GeocodeResult } from '../lib/geocode';

interface SearchState {
  query: string;
  results: GeocodeResult[];
  scrollY: number;
}

interface SearchContextValue {
  query: string;
  results: GeocodeResult[];
  scrollY: number;
  setQuery: (q: string) => void;
  setResults: (r: GeocodeResult[]) => void;
  setScrollY: (y: number) => void;
  getResult: (id: string) => GeocodeResult | undefined;
}

const STORAGE_KEY = 'search_state_v1';

const INITIAL_STATE: SearchState = {
  query: '',
  results: [],
  scrollY: 0,
};

function hydrate(): SearchState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<SearchState>;
    return {
      query: typeof parsed.query === 'string' ? parsed.query : '',
      results: Array.isArray(parsed.results) ? parsed.results : [],
      scrollY: typeof parsed.scrollY === 'number' ? parsed.scrollY : 0,
    };
  } catch {
    return INITIAL_STATE;
  }
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchState>(() => hydrate());

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota / serialization errors
    }
  }, [state]);

  const value: SearchContextValue = {
    query: state.query,
    results: state.results,
    scrollY: state.scrollY,
    setQuery: (q) => setState((s) => ({ ...s, query: q })),
    setResults: (r) => setState((s) => ({ ...s, results: r })),
    setScrollY: (y) => setState((s) => ({ ...s, scrollY: y })),
    getResult: (id) => state.results.find((r) => r.id === id),
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}
