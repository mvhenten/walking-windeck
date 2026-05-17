interface AuthBadgeProps {
  authenticated: boolean;
}

export function AuthBadge({ authenticated }: AuthBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs shadow">
      <span
        className={`inline-block h-2 w-2 rounded-full ${authenticated ? 'bg-[#7cc4ff]' : 'bg-muted-foreground'}`}
      />
      <span>{authenticated ? 'Google Drive' : 'Local only'}</span>
    </div>
  );
}
