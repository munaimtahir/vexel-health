import {
  deriveLabEncounterStatus,
  type LabEncounterStatus,
} from './lab-derived-status.util';

describe('deriveLabEncounterStatus', () => {
  const cases: Array<{
    name: string;
    items: { status: 'ORDERED' | 'RESULTS_ENTERED' | 'VERIFIED' }[];
    hasPublishedReport: boolean;
    expected: LabEncounterStatus;
  }> = [
    {
      name: 'no items -> DRAFT',
      items: [],
      hasPublishedReport: false,
      expected: 'DRAFT',
    },
    {
      name: 'no items, report exists -> DRAFT (no items)',
      items: [],
      hasPublishedReport: true,
      expected: 'DRAFT',
    },
    {
      name: 'all ORDERED -> ORDERED',
      items: [{ status: 'ORDERED' }],
      hasPublishedReport: false,
      expected: 'ORDERED',
    },
    {
      name: 'two ORDERED -> ORDERED',
      items: [{ status: 'ORDERED' }, { status: 'ORDERED' }],
      hasPublishedReport: false,
      expected: 'ORDERED',
    },
    {
      name: 'one RESULTS_ENTERED -> RESULTS_ENTERED',
      items: [{ status: 'RESULTS_ENTERED' }],
      hasPublishedReport: false,
      expected: 'RESULTS_ENTERED',
    },
    {
      name: 'one RESULTS_ENTERED one ORDERED -> RESULTS_ENTERED',
      items: [{ status: 'RESULTS_ENTERED' }, { status: 'ORDERED' }],
      hasPublishedReport: false,
      expected: 'RESULTS_ENTERED',
    },
    {
      name: 'one VERIFIED one ORDERED -> RESULTS_ENTERED',
      items: [{ status: 'VERIFIED' }, { status: 'ORDERED' }],
      hasPublishedReport: false,
      expected: 'RESULTS_ENTERED',
    },
    {
      name: 'all VERIFIED no report -> VERIFIED',
      items: [{ status: 'VERIFIED' }],
      hasPublishedReport: false,
      expected: 'VERIFIED',
    },
    {
      name: 'two VERIFIED no report -> VERIFIED',
      items: [{ status: 'VERIFIED' }, { status: 'VERIFIED' }],
      hasPublishedReport: false,
      expected: 'VERIFIED',
    },
    {
      name: 'all VERIFIED with report -> PUBLISHED',
      items: [{ status: 'VERIFIED' }],
      hasPublishedReport: true,
      expected: 'PUBLISHED',
    },
    {
      name: 'one ORDERED with report -> ORDERED',
      items: [{ status: 'ORDERED' }],
      hasPublishedReport: true,
      expected: 'ORDERED',
    },
    {
      name: 'one VERIFIED one ORDERED with report -> RESULTS_ENTERED',
      items: [{ status: 'VERIFIED' }, { status: 'ORDERED' }],
      hasPublishedReport: true,
      expected: 'RESULTS_ENTERED',
    },
  ];

  it.each(cases)('$name', ({ items, hasPublishedReport, expected }) => {
    expect(deriveLabEncounterStatus(items, hasPublishedReport)).toBe(expected);
  });
});
