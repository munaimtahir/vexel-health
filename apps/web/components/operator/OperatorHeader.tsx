'use client';

import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import type { paths } from '@vexel/contracts';

type MeResponse = paths['/me']['get']['responses'][200]['content']['application/json'];

type OperatorHeaderProps = {
  labName: string;
};

export function OperatorHeader({ labName }: OperatorHeaderProps) {
  const { data } = useQuery({
    queryKey: ['operator', 'me'],
    queryFn: async () => {
      const { data: response, error } = await client.GET('/me');
      if (error) {
        throw new Error(parseApiError(error, 'Failed to load user').message);
      }
      return response as MeResponse;
    },
  });

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
            {labName}
          </h1>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Operator
          </span>
        </div>
        <div className="text-sm text-[var(--muted)]">
          {data?.name ?? data?.email ?? 'User'}
        </div>
      </div>
    </header>
  );
}
