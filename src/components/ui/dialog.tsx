import * as React from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[2000] bg-black/80" onClick={() => onOpenChange(false)} />
      {/* Content */}
      <div className="fixed left-1/2 top-1/2 z-[2000] -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95">
        {children}
      </div>
    </>
  );
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogContent({ className, children }: DialogContentProps) {
  return (
    <div
      className={cn('w-full max-w-md rounded-lg border bg-card p-6 shadow-lg', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return <div className={cn('mb-4 flex flex-col space-y-1.5', className)}>{children}</div>;
}

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  return <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>;
}

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogDescription({ className, children }: DialogDescriptionProps) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>;
}

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogFooter({ className, children }: DialogFooterProps) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)}>{children}</div>;
}
