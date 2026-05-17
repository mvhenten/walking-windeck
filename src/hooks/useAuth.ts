import { useState, useEffect } from 'react';
import { initAuth, isAuthenticated, ensureToken, clearToken } from '../lib/auth';
import { checkMigration } from '../lib/store';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth().then(() => {
      setAuthenticated(isAuthenticated());
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    await ensureToken();
    await checkMigration();
    setAuthenticated(true);
    return true;
  };

  const signOut = () => {
    clearToken();
    setAuthenticated(false);
  };

  return {
    authenticated,
    loading,
    signIn,
    signOut,
  };
}
