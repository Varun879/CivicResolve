import React from 'react';

interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, body, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full w-full bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl text-on-surface-variant gap-4">
      {icon && (
        <span className="material-symbols-outlined text-4xl text-outline mb-2">
          {icon}
        </span>
      )}
      <h3 className="font-headline-md text-headline-md text-primary m-0">{title}</h3>
      {body && (
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm m-0">
          {body}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
