import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../hooks/useAuth';

export function SettingsPage() {
  const { authenticated, loading, signIn, signOut } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
      toast.success('Signed in to Google Drive');
    } catch (e) {
      toast.error(`Sign-in failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleSignOut = () => {
    signOut();
    toast.success('Signed out');
  };

  return (
    <div className="h-full overflow-auto bg-background p-4">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Google Drive Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {authenticated
                ? 'Your routes are synced to Google Drive.'
                : 'Sign in to sync your routes across devices.'}
            </p>
            {loading ? (
              <Button disabled>Loading...</Button>
            ) : authenticated ? (
              <Button onClick={handleSignOut} variant="outline">
                Sign out
              </Button>
            ) : (
              <Button onClick={handleSignIn}>Sign in with Google</Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Matshikes</strong>
              </div>
              <div className="text-muted-foreground">Hiking route planner with offline support</div>
              <Separator className="my-4" />
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Version 1.0.0</div>
                <div>
                  Routes powered by{' '}
                  <a
                    href="https://brouter.de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    BRouter
                  </a>
                </div>
                <div>
                  Maps ©{' '}
                  <a
                    href="https://opentopomap.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    OpenTopoMap
                  </a>
                  , OpenStreetMap
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
