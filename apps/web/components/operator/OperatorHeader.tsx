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
    <header className="relative z-20 border-b border-white/15 bg-slate-950/65 px-4 py-3 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="bg-gradient-to-r from-cyan-300 via-emerald-200 to-amber-200 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            {labName}
          </h1>
          <span className="rounded-full border border-cyan-300/35 bg-cyan-200/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-100">
            Operator
          </span>
        </div>
        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-slate-100">
          {data?.name ?? data?.email ?? 'User'}
        </div>
      </div>
    </header>
  );
}
