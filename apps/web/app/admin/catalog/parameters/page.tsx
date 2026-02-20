'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTableShell } from '@/components/admin/DataTableShell';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { components, paths } from '@vexel/contracts';

type ListCatalogParametersResponse =
  paths['/catalog/parameters']['get']['responses'][200]['content']['application/json'];
type CatalogParameter = components['schemas']['CatalogParameterDefinition'];
type CreateCatalogParameterRequest =
  paths['/catalog/parameters']['post']['requestBody']['content']['application/json'];

type ParameterResultType = components['schemas']['ParameterResultType'];

const resultTypeOptions: ParameterResultType[] = [
  'number',
  'integer',
  'decimal',
  'text',
  'enum',
  'boolean',
  'formula',
  'lis_imported',
];

const statusOptions = ['all', 'active', 'inactive'] as const;

export default function CatalogParametersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>('all');
  const [form, setForm] = useState<CreateCatalogParameterRequest>({
    parameterCode: '',
    parameterName: '',
    resultType: 'number',
    status: 'active',
  });

  const { data, error, isLoading } = useQuery({
    queryKey: adminKeys.catalogParameters(),
    queryFn: async () => {
      const { data, error } = await client.GET('/catalog/parameters');
      if (error) throw new Error(parseApiError(error, 'Failed to load parameters').message);
      return data as ListCatalogParametersResponse;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateCatalogParameterRequest = {
        ...form,
        parameterCode: form.parameterCode.trim(),
        parameterName: form.parameterName.trim(),
        defaultValue: form.defaultValue?.trim() ? form.defaultValue.trim() : undefined,
        formulaSpec: form.formulaSpec?.trim() ? form.formulaSpec.trim() : undefined,
      };
      const { data, error } = await client.POST('/catalog/parameters', { body: payload });
      if (error) throw new Error(parseApiError(error, 'Failed to create parameter').message);
      return data as CatalogParameter;
    },
    onSuccess: async () => {
      setForm({
        parameterCode: '',
        parameterName: '',
        resultType: 'number',
        status: 'active',
      });
      await queryClient.invalidateQueries({ queryKey: adminKeys.catalogParameters() });
    },
  });

  const onCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate();
  };

  const parameters = useMemo(() => {
    const rows = data?.data ?? [];
    return rows.filter((row) => {
      const matchesText =
        search.length === 0 ||
        row.parameterCode.toLowerCase().includes(search.toLowerCase()) ||
        row.parameterName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [data, search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parameters"
        subtitle="Global parameter dictionary (contract: /catalog/parameters)."
      />

      {error ? (
        <NoticeBanner title="Unable to load parameters" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {createMutation.error ? (
        <NoticeBanner title="Unable to create parameter" tone="warning">
          {createMutation.error instanceof Error ? createMutation.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <form onSubmit={onCreate} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-5">
        <input
          value={form.parameterCode}
          onChange={(event) => setForm((prev) => ({ ...prev, parameterCode: event.target.value }))}
          placeholder="Parameter code"
          required
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        />
        <input
          value={form.parameterName}
          onChange={(event) => setForm((prev) => ({ ...prev, parameterName: event.target.value }))}
          placeholder="Parameter name"
          required
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        />
        <select
          value={form.resultType}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, resultType: event.target.value as ParameterResultType }))
          }
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        >
          {resultTypeOptions.map((resultType) => (
            <option key={resultType} value={resultType}>
              {resultType}
            </option>
          ))}
        </select>
        <select
          value={form.status ?? 'active'}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))
          }
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating...' : 'Create'}
        </button>
      </form>

      <DataTableShell
        title="Catalog Parameters"
        subtitle="GET /catalog/parameters"
        isEmpty={!isLoading && parameters.length === 0}
        emptyTitle="No parameters found"
        emptyDescription="Create a parameter to populate the global dictionary."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search code or name"
              className="w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setSearch(searchInput.trim())}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              Search
            </button>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number])}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Result type</th>
              <th className="px-4 py-3 font-medium">Precision</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((parameter) => (
              <tr key={parameter.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{parameter.parameterCode}</td>
                <td className="px-4 py-3">{parameter.parameterName}</td>
                <td className="px-4 py-3">{parameter.resultType}</td>
                <td className="px-4 py-3">{parameter.precision ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusPill status={parameter.status === 'active' ? 'active' : 'inactive'} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={adminRoutes.catalogParameterDetail(parameter.id)}
                    className="text-sm font-medium text-[var(--accent)]"
                  >
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
