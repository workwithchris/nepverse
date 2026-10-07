import { cn } from '@/core/lib/utils';

export interface Detail {
  label: string;
  value: string;
  mono?: boolean;
}

/** Label/value rows in a bordered card. Missing values read as muted. */
export function DetailList({ details }: { details: Detail[] }) {
  return (
    <dl className="divide-y rounded-lg border bg-card text-sm">
      {details.map((detail) => {
        const missing = detail.value === 'Not recorded';
        return (
          <div
            key={detail.label}
            className="grid grid-cols-[8rem_1fr] gap-4 px-4 py-3 sm:grid-cols-[11rem_1fr]"
          >
            <dt className="text-muted-foreground">{detail.label}</dt>
            <dd
              className={cn(
                'min-w-0 break-words',
                detail.mono && 'font-mono tabular-nums',
                missing && 'text-muted-foreground/70',
              )}
            >
              {detail.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
