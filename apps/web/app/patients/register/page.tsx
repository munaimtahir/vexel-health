'use client';

import { PatientRegistrationForm } from '@/components/registration/PatientRegistrationForm';

/**
 * Patients-area registration page (standalone entry point).
 * For operator workflow, use /operator/register so the form renders under the operator shell.
 */
export default function RegisterPatientPage() {
  return (
    <PatientRegistrationForm
      backHref="/patients"
      backLabel="Back to patients"
      registerAnotherHref="/patients/register"
    />
  );
}
