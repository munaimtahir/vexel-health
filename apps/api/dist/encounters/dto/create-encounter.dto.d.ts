declare const allowedEncounterTypes: readonly ["LAB", "RAD", "OPD", "BB", "IPD"];
export declare class CreateEncounterDto {
    patientId: string;
    type: (typeof allowedEncounterTypes)[number];
    startedAt?: string;
}
export {};
