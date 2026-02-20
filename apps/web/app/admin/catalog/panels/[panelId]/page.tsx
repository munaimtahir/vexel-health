'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type PanelResponse = paths['/lab/panels/{panelId}']['get']['responses'][200]['content']['application/json'];
type TestsResponse = paths['/lab/tests']['get']['responses'][200]['content']['application/json'];

export default function PanelDetailPage() {
  const params = useParams<{ panelId: string }>();
  const panelId = typeof params.panelId === 'string' ? params.panelId : '';
  const queryClient = useQueryClient();

  const { data: panelData, error, isLoading } = useQuery({
    queryKey: adminKeys.panel(panelId),
    enabled: panelId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/lab/panels/{panelId}', {
        params: {
          path: {
            panelId,
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load panel').message);
      return data as PanelResponse;
    },
  });

  const { data: testsData } = useQuery({
    queryKey: adminKeys.tests(),
    queryFn: async () => {
      const { data, error } = await client.GET('/lab/tests');
      if (error) throw new Error(parseApiError(error, 'Failed to load tests').message);
      return data as TestsResponse;
    },
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  useEffect(() => {
    if (!panelData) return;
    setName(panelData.name ?? '');
    setDescription(panelData.description ?? '');
    setActive(Boolean(panelData.active));
  }, [panelData]);

  const availableTests = useMemo(() => {
    const linked = new Set((panelData?.tests ?? []).map((test) => test.testId));
    return (testsData?.data ?? []).filter((test) => !linked.has(test.id));
  }, [panelData, testsData]);

  useEffect(() => {
    if (!selectedTestId && availableTests[0]?.id) {
      setSelectedTestId(availableTests[0].id);
    }
  }, [availableTests, selectedTestId]);

  const updatePanel = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.PATCH('/lab/panels/{panelId}', {
        params: {
          path: {
            panelId,
          },
        },
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          active,
        },
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to update panel').message);
      }
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.panel(panelId) }),
        queryClient.invalidateQueries({ queryKey: adminKeys.panels() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
  });

  const addTest = useMutation({
    mutationFn: async () => {
      const nextSortOrder = sortOrder.trim() ? Number(sortOrder) : undefined;
      const { data, error } = await client.POST('/lab/panels/{panelId}:add-test', {
        params: {
          path: {
            panelId,
          },
        },
        body: {
          testId: selectedTestId,
          sortOrder: Number.isFinite(nextSortOrder) ? nextSortOrder : undefined,
        },
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to add test').message);
      }
      return data;
    },
    onSuccess: async () => {
      setSortOrder('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.panel(panelId) }),
        queryClient.invalidateQueries({ queryKey: adminKeys.panels() }),
      ]);
    },
  });

  const removeTest = useMutation({
    mutationFn: async (testId: string) => {
      const { data, error } = await client.POST('/lab/panels/{panelId}:remove-test', {
        params: {
          path: {
            panelId,
          },
        },
        body: {
          testId,
        },
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to remove test').message);
      }
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.panel(panelId) }),
        queryClient.invalidateQueries({ queryKey: adminKeys.panels() }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel Detail"
        subtitle="Edit panel metadata and maintain deterministic panel test composition."
        actions={
          <button
            type="button"
            disabled={updatePanel.isPending || isLoading}
            onClick={() => updatePanel.mutate()}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
          >
            {updatePanel.isPending ? 'Saving...' : 'Save Panel'}
          </button>
        }
      />

      {error ? (
        <NoticeBanner title="Unable to load panel" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {updatePanel.error ? (
        <NoticeBanner title="Unable to update panel" tone="warning">
          {updatePanel.error instanceof Error ? updatePanel.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {addTest.error ? (
        <NoticeBanner title="Unable to add test" tone="warning">
          {addTest.error instanceof Error ? addTest.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {removeTest.error ? (
        <NoticeBanner title="Unable to remove test" tone="warning">
          {removeTest.error instanceof Error ? removeTest.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <AdminCard title="Summary">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">ID</p>
            <p className="mt-1 text-sm font-medium">{(panelData?.id ?? panelId) || '—'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Code</p>
            <p className="mt-1 text-sm font-medium">{panelData?.code ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Status</p>
            <div className="mt-1">
              <StatusPill status={panelData?.active ? 'active' : 'inactive'} />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Tests</p>
            <p className="mt-1 text-sm font-medium">{panelData?.tests?.length ?? 0}</p>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Edit Panel">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Panel name"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Active
          </label>
        </div>
      </AdminCard>

      <AdminCard title="Add Test To Panel">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={selectedTestId}
            onChange={(event) => setSelectedTestId(event.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            {availableTests.length === 0 ? <option value="">No available tests</option> : null}
            {availableTests.map((test) => (
              <option key={test.id} value={test.id}>
                {test.code} · {test.name}
              </option>
            ))}
          </select>
          <input
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            type="number"
            min={0}
            placeholder="Sort order (optional)"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={addTest.isPending || !selectedTestId}
            onClick={() => addTest.mutate()}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
          >
            {addTest.isPending ? 'Adding...' : 'Add Test'}
          </button>
        </div>
      </AdminCard>

      <AdminCard title="Panel Tests">
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Sort Order</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(panelData?.tests ?? []).map((test) => (
                <tr key={test.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">{test.sortOrder}</td>
                  <td className="px-4 py-3">{test.testCode ?? '—'}</td>
                  <td className="px-4 py-3">{test.testName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={removeTest.isPending}
                      onClick={() => removeTest.mutate(test.testId)}
                      className="text-sm font-medium text-[var(--error)] underline disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
