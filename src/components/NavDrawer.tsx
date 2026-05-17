import { Link, useLocation } from 'wouter';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useTrackerContext } from '../contexts/TrackerContext';
import { formatDistance } from '../lib/stats';
import { formatDuration } from '../lib/geo';

interface NavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStopRequested: () => void;
}

export function NavDrawer({ open, onOpenChange, onStopRequested }: NavDrawerProps) {
  const [location] = useLocation();
  const tracker = useTrackerContext();
  const stats = tracker.getStats();

  const handleStart = async () => {
    await tracker.start();
  };

  const handlePause = () => {
    tracker.pause();
  };

  const handleResume = async () => {
    await tracker.resume();
  };

  const handleStop = () => {
    onOpenChange(false);
    onStopRequested();
  };

  const isTracking = tracker.status === 'recording' || tracker.status === 'paused';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-sm text-muted-foreground">WalkingWindeck</SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-6">
          {/* Stats block when tracking */}
          {isTracking && (
            <div className="rounded-lg border bg-accent/50 p-4">
              <div className="mb-3 text-sm font-medium">Current Track</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                  <div className="font-mono font-semibold">
                    {formatDuration(tracker.elapsedTime)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Distance</div>
                  <div className="font-mono font-semibold">{formatDistance(stats.distance)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ascent</div>
                  <div className="font-mono font-semibold">{Math.round(stats.ascent)} m</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Points</div>
                  <div className="font-mono font-semibold">{stats.pointCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* Primary actions */}
          <div className="flex flex-col gap-3">
            {tracker.status === 'idle' && (
              <Button onClick={handleStart} size="lg" className="w-full min-h-[44px]">
                Start tracking
              </Button>
            )}

            {tracker.status === 'recording' && (
              <>
                <Button
                  onClick={handlePause}
                  variant="outline"
                  size="lg"
                  className="w-full min-h-[44px]"
                >
                  Pause
                </Button>
                <Button
                  onClick={handleStop}
                  variant="outline"
                  size="lg"
                  className="w-full min-h-[44px]"
                >
                  Stop
                </Button>
              </>
            )}

            {tracker.status === 'paused' && (
              <>
                <Button onClick={handleResume} size="lg" className="w-full min-h-[44px]">
                  Resume
                </Button>
                <Button
                  onClick={handleStop}
                  variant="outline"
                  size="lg"
                  className="w-full min-h-[44px]"
                >
                  Stop
                </Button>
              </>
            )}
          </div>

          <Separator />

          {/* Nav links */}
          <nav className="flex flex-col gap-2">
            <Link href="/">
              <a
                className={`block rounded-md px-4 py-3 text-sm font-medium transition-colors hover:bg-accent ${
                  location === '/' ? 'bg-accent' : ''
                }`}
                onClick={() => onOpenChange(false)}
              >
                Map
              </a>
            </Link>
            <Link href="/routes">
              <a
                className={`block rounded-md px-4 py-3 text-sm font-medium transition-colors hover:bg-accent ${
                  location === '/routes' ? 'bg-accent' : ''
                }`}
                onClick={() => onOpenChange(false)}
              >
                Saved routes
              </a>
            </Link>
            <Link href="/settings">
              <a
                className={`block rounded-md px-4 py-3 text-sm font-medium transition-colors hover:bg-accent ${
                  location === '/settings' ? 'bg-accent' : ''
                }`}
                onClick={() => onOpenChange(false)}
              >
                Settings
              </a>
            </Link>
          </nav>

          {/* Footer */}
          <div className="mt-auto pt-6 text-xs text-muted-foreground">Version 1.0.0</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
