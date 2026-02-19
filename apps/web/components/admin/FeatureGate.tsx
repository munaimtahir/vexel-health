import type { ReactNode } from 'react';
import { useFeatures } from '@/lib/admin/useFeatures';

type FeatureGateProps = {
  featureKey: string;
  /** When undefined, resolved from GET /me/features. When set, overrides backend. */
  enabled?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Gate for backend-authoritative feature flags. When `enabled` is undefined,
 * looks up `featureKey` in GET /me/features; missing or false shows fallback.
 */
export function FeatureGate({ featureKey, enabled, fallback = null, children }: FeatureGateProps) {
  const { isEnabled, isLoading } = useFeatures();
  const resolved = enabled !== undefined ? enabled : isEnabled(featureKey);
  if (isLoading && enabled === undefined) {
    return null;
  }
  if (!resolved) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
