/**
 * Normalizes API response shapes into IdentityHeader props.
 * Defensive: unknown fields leave props undefined.
 */

export type IdentityPatient = {
    registrationNo?: string;
    name?: string;
    age?: string | number;
    gender?: string;
    phone?: string;
};

export type IdentityEncounter = {
    code?: string;
    status?: string;
};

export type IdentityModuleRef = {
    type?: 'LIMS' | 'RIMS' | 'BB' | 'OPD';
    code?: string;
    status?: string;
};

export type IdentityHeaderProps = {
    patient?: IdentityPatient;
    encounter?: IdentityEncounter;
    moduleRef?: IdentityModuleRef;
};

/** Pick registration number from various API field names */
function pickRegistrationNo(obj: Record<string, unknown> | null | undefined): string | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    const v = (obj.registrationNo ?? obj.regNo ?? obj.registration_number ?? obj.mrn) as string | undefined;
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/** Map API patient-like object to IdentityPatient */
export function mapPatient(api: Record<string, unknown> | null | undefined): IdentityPatient | undefined {
    if (!api || typeof api !== 'object') return undefined;
    const registrationNo = pickRegistrationNo(api);
    const name = (api.name as string) ?? undefined;
    const gender = (api.gender as string) ?? undefined;
    const phone = (api.phone as string) ?? undefined;
    if (!registrationNo && !name && !gender && !phone) return undefined;
    let age: string | number | undefined;
    if (api.age !== undefined && api.age !== null) {
        age = typeof api.age === 'number' ? api.age : String(api.age);
    } else if (api.dob) {
        const dob = new Date(api.dob as string);
        if (!Number.isNaN(dob.getTime())) {
            const now = new Date();
            const years = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            age = years;
        }
    }
    return { registrationNo, name, age, gender, phone };
}

/** Map API encounter-like object to IdentityEncounter */
export function mapEncounter(api: Record<string, unknown> | null | undefined): IdentityEncounter | undefined {
    if (!api || typeof api !== 'object') return undefined;
    const code = (api.encounterCode ?? api.code ?? api.visitCode) as string | undefined;
    const status = (api.status as string) ?? undefined;
    if (!code && !status) return undefined;
    return { code, status };
}

/** Map API module order/request to IdentityModuleRef. Uses only order-level code (orderCode/requestCode); never encounter/visit code. */
export function mapModuleRef(
    api: Record<string, unknown> | null | undefined,
    type: IdentityModuleRef['type'] = 'LIMS'
): IdentityModuleRef | undefined {
    if (!api || typeof api !== 'object') return undefined;
    const code = (api.orderCode ?? api.requestCode) as string | undefined;
    const status = (api.status as string) ?? undefined;
    if (!code && !status) return undefined;
    return { type, code, status };
}

/** Build full IdentityHeader props from API responses */
export function mapIdentityHeader(args: {
    patient?: Record<string, unknown> | null;
    encounter?: Record<string, unknown> | null;
    moduleRef?: Record<string, unknown> | null;
    moduleType?: IdentityModuleRef['type'];
}): IdentityHeaderProps {
    return {
        patient: mapPatient(args.patient),
        encounter: mapEncounter(args.encounter),
        moduleRef: args.moduleRef
            ? mapModuleRef(args.moduleRef, args.moduleType)
            : undefined,
    };
}
