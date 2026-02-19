import type { LabOrderItemStatus } from '@prisma/client';

/**
 * Derived lab encounter status — single global truth for display and queue.
 * Not stored in DB; computed from encounter + lab order items + document state.
 */
export type LabEncounterStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'RESULTS_ENTERED'
  | 'VERIFIED'
  | 'PUBLISHED';

export type LabOrderItemStatusLike = LabOrderItemStatus;

/**
 * Derives the lab encounter status from current state.
 *
 * Rules:
 * - DRAFT: no lab order items
 * - ORDERED: has items, none with results entered (all ORDERED)
 * - RESULTS_ENTERED: any item has RESULTS_ENTERED, not all verified
 * - VERIFIED: all items VERIFIED (regardless of publish)
 * - PUBLISHED: report published for encounter and all items are VERIFIED
 *
 * @param labOrderItems - status of each lab order item for this encounter (empty = no items)
 * @param hasPublishedReport - true if a document exists for this encounter with status RENDERED
 */
export function deriveLabEncounterStatus(
  labOrderItems: { status: LabOrderItemStatusLike }[],
  hasPublishedReport: boolean,
): LabEncounterStatus {
  if (!labOrderItems.length) {
    return 'DRAFT';
  }

  const allVerified = labOrderItems.every((item) => item.status === 'VERIFIED');
  if (hasPublishedReport && allVerified) {
    return 'PUBLISHED';
  }

  if (allVerified) {
    return 'VERIFIED';
  }

  const anyResultsEntered = labOrderItems.some(
    (item) => item.status === 'RESULTS_ENTERED' || item.status === 'VERIFIED',
  );
  if (anyResultsEntered) {
    return 'RESULTS_ENTERED';
  }

  return 'ORDERED';
}
