declare const allowedGenders: readonly ["male", "female", "other"];
export declare class CreatePatientDto {
    name: string;
    dob?: string;
    gender?: (typeof allowedGenders)[number];
    phone?: string;
}
export {};
