import { Suspense } from "react";
import SupervisorClient from "./SupervisorClient";

export const dynamic = "force-dynamic";

export default function SupervisorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-600">
          Cargando formulario...
        </div>
      }
    >
      <SupervisorClient />
    </Suspense>
  );
}
