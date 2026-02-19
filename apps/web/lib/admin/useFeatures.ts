'use client';

import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/sdk/client';
import { parseApiError } from '@/lib/api-errors';
import { adminKeys } from '@/lib/sdk/hooks';
import type { paths } from '@vexel/contracts';

type FeaturesResponse = paths['/me/features']['get']['responses'][200]['content']['application/json'];

/**
 * Fetches backend-authoritative feature flags for the current user/tenant.
 * Used by FeatureGate and AdminNav to hide UI when flags are disabled.
 */
export function useFeatures() {
  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.features(),
    queryFn: async () => {
      const { data: response, error: apiError } = await client.GET('/me/features');
      if (apiError) {
        throw new Error(parseApiError(apiError, 'Failed to load feature flags').message);
      }
      return (response ?? {}) as FeaturesResponse;
    },
  });

  const features = data ?? {};
  const isEnabled = (key: string) => Boolean(features[key]);

  return { features, isLoading, error, isEnabled };
}
