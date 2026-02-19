import { DomainException } from '../errors/domain.exception';

export type ReferenceRangeCandidate = {
  id: string;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
};

export function normalizeCatalogText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function ensureSingleReferenceRangeMatch(
  candidates: ReferenceRangeCandidate[],
): ReferenceRangeCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length > 1) {
    throw new DomainException(
      'AMBIGUOUS_REFERENCE_RANGE_MATCH',
      'Multiple reference ranges matched the current demographics',
      {
        candidate_ids: candidates.map((candidate) => candidate.id),
      },
    );
  }

  return candidates[0];
}

