import React from 'react';
import clsx from 'clsx';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  className,
  children,
  ...props
}) => {
  return (
    <div className={clsx('empty-state', className)} {...props}>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
      {children}
    </div>
  );
};
