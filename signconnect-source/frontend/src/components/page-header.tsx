import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, icon }: PageHeaderProps) {
  return (
    <header className="mb-8 animate-fade-up">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {icon && (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-card">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                {eyebrow}
              </div>
            )}
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </header>
  );
}
