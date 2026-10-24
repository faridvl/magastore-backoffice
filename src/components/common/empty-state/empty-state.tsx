import React from 'react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Button, ButtonVariant } from '@/components/common/button/button';

interface EmptyStateProps {
  /** Máximo 8 palabras. */
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ title, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-4 px-6 py-16 text-center ${className ?? ''}`}>
      <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-500">
        {title}
      </Typography>
      {actionLabel && onAction && (
        <Button variant={ButtonVariant.GHOST} text={actionLabel} onClick={onAction} />
      )}
    </div>
  );
}
