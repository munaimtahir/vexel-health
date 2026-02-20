'use client';

import Link from 'next/link';
import { useState } from 'react';
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

type UsersResponse = paths['/admin/users']['get']['responses'][200]['content']['application/json'];

type UserRow = NonNullable<UsersResponse['data']>[number];

export default function UsersListPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.usersList({ page, limit: 20, query }),
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/users', {
        params: {
          query: {
            page,
            limit: 20,
            query: query || undefined,
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load users').message);
      return data as UsersResponse;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (input: { userId: string; status: 'active' | 'inactive' }) => {
      const { data, error } = await client.PATCH('/admin/users/{userId}', {
        params: {
          path: {
            userId: input.userId,
          },
        },
        body: {
          status: input.status,
        },
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to update user status').message);
      }
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasNextPage = page * 20 < total;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Tenant-scoped user list, detail, invite, and activation controls."
        actions={
          <Link
            href={adminRoutes.usersInvite}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
          >
            Invite User
          </Link>
        }
      />

      {error ? (
        <NoticeBanner title="Unable to load users" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {toggleStatus.error ? (
        <NoticeBanner title="Unable to update user" tone="warning">
          {toggleStatus.error instanceof Error ? toggleStatus.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <DataTableShell
        title="Tenant Users"
        subtitle="Contract endpoint: `GET /admin/users`"
        isEmpty={!isLoading && users.length === 0}
        emptyTitle="No users found"
        emptyDescription="Invite a user to create a pending invite and onboard tenant members."
        toolbar={
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setQuery(searchInput.trim());
            }}
          >
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or email"
              className="w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium"
            >
              Search
            </button>
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setQuery('');
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                Clear
              </button>
            ) : null}
          </form>
        }
      >
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Roles</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{user.name ?? '—'}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{(user.roles ?? []).join(', ') || '—'}</td>
                <td className="px-4 py-3">
                  <StatusPill status={user.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={adminRoutes.userDetail(user.id)} className="text-sm font-medium text-[var(--accent)]">
                      Open
                    </Link>
                    <button
                      type="button"
                      disabled={toggleStatus.isPending}
                      onClick={() => {
                        const nextStatus: 'active' | 'inactive' = user.status === 'active' ? 'inactive' : 'active';
                        toggleStatus.mutate({ userId: user.id, status: nextStatus });
                      }}
                      className="text-sm font-medium text-[var(--text)] underline disabled:opacity-60"
                    >
                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">Total users: {total}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--muted)]">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!hasNextPage}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
