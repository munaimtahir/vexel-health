'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { NoticeBanner } from '@/components/admin/NoticeBanner';
import { PageHeader } from '@/components/admin/PageHeader';
import { adminRoutes } from '@/lib/admin/routes';
import { parseApiError } from '@/lib/api-errors';
import { client } from '@/lib/sdk/client';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type UsersResponse = paths['/admin/users']['get']['responses'][200]['content']['application/json'];
type InviteResponse = paths['/admin/users/invite']['post']['responses'][201]['content']['application/json'];

const defaultRoleOptions = ['ADMIN', 'OPERATOR', 'VERIFIER', 'VIEWER'] as const;

export default function InviteUserPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('168');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['ADMIN']);
  const [createdInvite, setCreatedInvite] = useState<InviteResponse | null>(null);

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

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/admin/users/invite', {
        body: {
          name: name.trim(),
          email: email.trim(),
          roleNames: selectedRoles,
          expiresInHours: Number(expiresInHours),
        },
      });
      if (error) {
        throw new Error(parseApiError(error, 'Failed to create invite').message);
      }
      return data as InviteResponse;
    },
    onSuccess: (invite) => {
      setCreatedInvite(invite);
      setName('');
      setEmail('');
      setExpiresInHours('168');
      setSelectedRoles(['ADMIN']);
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatedInvite(null);
    inviteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invite User"
        subtitle="Create tenant-scoped pending user invites with explicit role mapping and expiry."
        actions={
          <Link
            href={adminRoutes.usersList}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium"
          >
            Back to Users
          </Link>
        }
      />

      {inviteMutation.error ? (
        <NoticeBanner title="Unable to create invite" tone="warning">
          {inviteMutation.error instanceof Error ? inviteMutation.error.message : 'Unknown error'}
        </NoticeBanner>
      ) : null}

      {createdInvite ? (
        <NoticeBanner title="Invite created" tone="info">
          Invite ID: <code>{createdInvite.inviteId}</code> · Status: <strong>{createdInvite.status}</strong> · Expires:{' '}
          {new Date(createdInvite.expiresAt).toLocaleString()}
        </NoticeBanner>
      ) : null}

      <AdminCard title="Invite / Create User" subtitle="Backend endpoint: `POST /admin/users/invite`.">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--muted)]">Full Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--muted)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--muted)]">Expires In (hours)</span>
            <input
              type="number"
              min={1}
              max={720}
              value={expiresInHours}
              onChange={(event) => setExpiresInHours(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>

          <div className="space-y-1">
            <span className="text-sm font-medium text-[var(--muted)]">Roles</span>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              {availableRoles.map((role) => {
                const checked = selectedRoles.includes(role);
                return (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setSelectedRoles((prev) => {
                          if (event.target.checked) {
                            return Array.from(new Set([...prev, role]));
                          }
                          const next = prev.filter((item) => item !== role);
                          return next.length > 0 ? next : prev;
                        });
                      }}
                    />
                    {role}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={inviteMutation.isPending || selectedRoles.length === 0}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}
