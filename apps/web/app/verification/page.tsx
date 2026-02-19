'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { parseApiError } from '@/lib/api-errors';
import type { paths } from '@vexel/contracts';

type VerificationQueueResponse =
  paths['/lab/verification-queue']['get']['responses'][200]['content']['application/json'];
type VerificationQueueItem = NonNullable<
  VerificationQueueResponse['items']
>[number];

export default function VerificationPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['lab', 'verification-queue'],
    queryFn: async () => {
      const { data: res, error: apiError } = await client.GET(
        '/lab/verification-queue',
        { params: { query: { limit: 50 } } },
      );
      if (apiError) {
        throw new Error(
          parseApiError(apiError, 'Failed to load verification queue').message,
        );
      }
      return res;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({
      encounterId,
      orderItemId,
    }: {
      encounterId: string;
      orderItemId: string;
    }) => {
      const { error: apiError } = await client.POST(
        '/encounters/{id}:lab-verify',
        {
          params: { path: { id: encounterId } },
          body: { orderItemId },
        },
      );
      if (apiError) {
        throw new Error(
          parseApiError(apiError, 'Verification failed').message,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab', 'verification-queue'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Verification Queue</h1>
        <p>Loading...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Verification Queue</h1>
        <p className="text-red-600">
          {error instanceof Error ? error.message : 'Failed to load queue'}
        </p>
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Verification Queue</h1>
      <p className="text-gray-600 mb-4">
        Lab order items with results entered, pending verification.
      </p>
      {items.length === 0 ? (
        <p className="text-gray-500">No items pending verification.</p>
      ) : (
        <div className="bg-white shadow rounded overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Patient
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  MRN / Ref
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Test
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Results entered
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row: VerificationQueueItem) => (
                <tr key={row.lab_order_item_id}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {row.patient?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {row.patient?.mrn ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {row.test?.test_name ?? row.test?.test_code ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {row.results_entered_at
                      ? new Date(row.results_entered_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {row.derived_encounter_status ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-sm space-x-2">
                    <Link
                      href={`/encounters/${row.encounter_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Open encounter
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          row.encounter_id &&
                          row.lab_order_item_id
                        ) {
                          verifyMutation.mutate({
                            encounterId: row.encounter_id,
                            orderItemId: row.lab_order_item_id,
                          });
                        }
                      }}
                      disabled={verifyMutation.isPending}
                      className="ml-2 text-green-600 hover:underline disabled:opacity-50"
                    >
                      {verifyMutation.isPending ? 'Verifying…' : 'Verify'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {verifyMutation.isError && (
        <p className="mt-2 text-red-600">
          {verifyMutation.error instanceof Error
            ? verifyMutation.error.message
            : 'Verification failed'}
        </p>
      )}
    </div>
  );
}
