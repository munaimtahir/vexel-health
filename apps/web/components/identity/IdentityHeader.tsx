'use client';

import { CopyableField } from './CopyableField';
import type { IdentityHeaderProps } from '@/lib/identity/mapIdentity';

export function IdentityHeader({ patient, encounter, moduleRef }: IdentityHeaderProps) {
    const regNo = patient?.registrationNo ?? '—';
    const name = patient?.name ?? '—';
    const age = patient?.age != null ? String(patient.age) : undefined;
    const gender = patient?.gender ?? undefined;
    const phone = patient?.phone ?? undefined;

    const showVisitChip = encounter?.code != null || encounter?.status != null;
    const visitLabel = encounter?.code ? `Visit: ${encounter.code}` : 'Visit';
    const visitValue = encounter?.code ?? encounter?.status ?? '—';

    const showModuleChip = moduleRef?.code != null;
    const moduleLabel = moduleRef?.type && moduleRef?.code
        ? `${moduleRef.type}: ${moduleRef.code}`
        : moduleRef?.type ?? 'Order';
    const moduleValue = moduleRef?.code ?? moduleRef?.status ?? '—';

    return (
        <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <CopyableField
                        label="Reg #"
                        value={regNo}
                        copyValue={regNo === '—' ? undefined : regNo}
                        size="lg"
                    />
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-gray-700">
                        <span className="font-medium">{name}</span>
                        {age != null && <span>{age}y</span>}
                        {gender != null && <span className="capitalize">{gender}</span>}
                        {phone != null && phone.trim() !== '' && <span>{phone}</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {showVisitChip && (
                        <span
                            className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                            title={visitValue}
                        >
                            {visitLabel}
                        </span>
                    )}
                    {showModuleChip && (
                        <span
                            className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                            title={moduleValue}
                        >
                            {moduleLabel}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
