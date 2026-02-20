'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type PanelsResponse = paths['/lab/panels']['get']['responses'][200]['content']['application/json'];

export default function CatalogPanelsPage() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.panels(),
    queryFn: async () => {
      const { data, error } = await client.GET('/lab/panels');
      if (error) throw new Error(parseApiError(error, 'Failed to load panels').message);
      return data as PanelsResponse;
    },
  });

  const createPanel = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/lab/panels', {
        body: {
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          active: true,
        },
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to create panel').message);
      }
      return data;
    },
    onSuccess: async () => {
      setCode('');
      setName('');
      setDescription('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.panels() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
  });

  const panels = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panels"
        subtitle="Create and manage tenant-scoped LAB panels with deterministic test ordering."
      />

      {error ? (
        <NoticeBanner title="Unable to load panels" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {createPanel.error ? (
        <NoticeBanner title="Unable to create panel" tone="warning">
          {createPanel.error instanceof Error ? createPanel.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <DataTableShell
        title="Create Panel"
        subtitle="Contract endpoint: `POST /lab/panels`"
        isEmpty={false}
      >
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            createPanel.mutate();
          }}
          className="grid min-w-full grid-cols-1 gap-3 p-4 md:grid-cols-4"
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Code (e.g. LFT)"
            required
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Panel name"
            required
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={createPanel.isPending}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
          >
            {createPanel.isPending ? 'Creating...' : 'Create Panel'}
          </button>
        </form>
      </DataTableShell>

      <DataTableShell
        title="Panel Definitions"
        subtitle="Contract endpoint: `GET /lab/panels`"
        isEmpty={!isLoading && panels.length === 0}
        emptyTitle="No panels found"
        emptyDescription="Create your first panel using the form above."
      >
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Tests</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {panels.map((panel) => (
              <tr key={panel.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium">{panel.code}</td>
                <td className="px-4 py-3">{panel.name}</td>
                <td className="px-4 py-3">{panel.tests?.length ?? 0}</td>
                <td className="px-4 py-3">
                  <StatusPill status={panel.active ? 'active' : 'inactive'} />
                </td>
                <td className="px-4 py-3">{panel.updatedAt ? new Date(panel.updatedAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <Link href={adminRoutes.catalogPanelDetail(panel.id)} className="text-sm font-medium text-[var(--accent)]">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
