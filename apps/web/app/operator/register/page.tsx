'use client';

import { PatientRegistrationForm } from '@/components/registration/PatientRegistrationForm';
import { operatorRoutes } from '@/lib/operator/routes';

/**
 * Operator registration page. Renders the shared patient registration form
 * inside the operator shell (sidebar + theme) so navigation from workflow
 * to registration keeps the same layout.
 */
export default function OperatorRegisterPage() {
  return (
    <PatientRegistrationForm
      backHref={operatorRoutes.worklist}
      backLabel="Back to worklist"
      registerAnotherHref={operatorRoutes.register}
    />
  );
}
