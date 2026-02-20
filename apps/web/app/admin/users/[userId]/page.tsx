'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { FieldRow } from '@/components/admin/FieldRow';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type UserResponse = paths['/admin/users/{userId}']['get']['responses'][200]['content']['application/json'];
type UsersResponse = paths['/admin/users']['get']['responses'][200]['content']['application/json'];

const defaultRoleOptions = ['ADMIN', 'OPERATOR', 'VERIFIER', 'VIEWER'] as const;

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const queryClient = useQueryClient();

  const { data: userData, error, isLoading } = useQuery({
    queryKey: adminKeys.user(userId),
    enabled: userId.length > 0,
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/users/{userId}', {
        params: {
          path: {
            userId,
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load user detail').message);
      return data as UserResponse;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: adminKeys.users(),
    queryFn: async () => {
      const { data, error } = await client.GET('/admin/users', {
        params: {
          query: {
            limit: 100,
            page: 1,
          },
        },
      });
      if (error) throw new Error(parseApiError(error, 'Failed to load roles').message);
      return data as UsersResponse;
    },
  });

  const availableRoles = useMemo(() => {
    const roles = new Set<string>(defaultRoleOptions);
    for (const user of usersData?.data ?? []) {
      for (const role of user.roles ?? []) {
        if (role.trim()) {
          roles.add(role.trim());
        }
      }
    }
    return Array.from(roles).sort();
  }, [usersData]);

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (userData?.roles) {
      setSelectedRoles(userData.roles);
    }
  }, [userData]);

  const updateMutation = useMutation({
    mutationFn: async (body: { status?: 'active' | 'inactive'; roleNames?: string[] }) => {
      const { data, error } = await client.PATCH('/admin/users/{userId}', {
        params: {
          path: {
            userId,
          },
        },
        body,
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to update user').message);
      }
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) }),
        queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.overview() }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Detail"
        subtitle="Update tenant user status and role mapping with backend-enforced tenancy."
        actions={
          <>
            <Link
              href={adminRoutes.usersList}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium"
            >
              Back to Users
            </Link>
            <button
              type="button"
              disabled={updateMutation.isPending || !userData}
              onClick={() => {
                if (!userData) return;
                const nextStatus: 'active' | 'inactive' = userData.status === 'active' ? 'inactive' : 'active';
                updateMutation.mutate({ status: nextStatus });
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {userData?.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              disabled={updateMutation.isPending || selectedRoles.length === 0}
              onClick={() => updateMutation.mutate({ roleNames: selectedRoles })}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
            >
              Save Role Mapping
            </button>
          </>
        }
      />

      {error ? (
        <NoticeBanner title="Unable to load user" tone="warning">
          {error instanceof Error ? error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {updateMutation.error ? (
        <NoticeBanner title="Unable to update user" tone="warning">
          {updateMutation.error instanceof Error ? updateMutation.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdminCard title="Summary" className="xl:col-span-1">
          <dl>
            <FieldRow label="User ID" value={(userData?.id ?? userId) || '—'} />
            <FieldRow label="Name" value={userData?.name ?? '—'} />
            <FieldRow label="Email" value={userData?.email ?? '—'} />
            <FieldRow
              label="Status"
              value={isLoading ? <StatusPill status="pending" /> : <StatusPill status={userData?.status} />}
            />
            <FieldRow label="Created" value={userData?.createdAt ? new Date(userData.createdAt).toLocaleString() : '—'} />
          </dl>
        </AdminCard>

        <AdminCard title="Role Assignment" className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {availableRoles.map((role) => (
              <label
                key={role}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              >
                <span className="text-sm font-medium">{role}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedRoles.includes(role)}
                  onChange={(event) => {
                    setSelectedRoles((prev) => {
                      if (event.target.checked) {
                        return Array.from(new Set([...prev, role]));
                      }
                      return prev.filter((item) => item !== role);
                    });
                  }}
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">Selected roles: {selectedRoles.join(', ') || 'None'}</p>
        </AdminCard>
      </div>
    </div>
  );
}
