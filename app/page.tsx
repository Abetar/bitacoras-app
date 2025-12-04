"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [supervisorId, setSupervisorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = supervisorId.trim();

    if (!trimmed) {
      setErrorMsg("Por favor ingresa tu ID de supervisor.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/supervisor?id=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg("ID inválido. Verifica tu ID de supervisor.");
        return;
      }

      // ID válido → enviamos al formulario de bitácora
      router.push(`/supervisor?user=${encodeURIComponent(trimmed)}`);
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error al validar el ID. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">
            Bitácora diaria de supervisión
          </h1>
          <p className="text-sm text-slate-600">
            Ingresa tu ID de supervisor para llenar la bitácora del día.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="supervisorId"
              className="text-sm font-medium text-slate-700"
            >
              ID de supervisor
            </label>
            <input
              id="supervisorId"
              type="text"
              placeholder="Ejemplo: recAKr6ktejjFxhQA"
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errorMsg && (
              <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? "Verificando..." : "Entrar como supervisor"}
          </button>
        </form>

        <div className="border-t pt-4 text-xs text-slate-500 space-y-1">
          <p>
            Pide a sistemas tu <span className="font-mono">ID de supervisor</span> 
            si aún no lo tienes.
          </p>
          <p>
            Si eres administrador, puedes revisar las bitácoras en{" "}
            <a
              href="/admin"
              className="font-semibold text-blue-600 hover:underline"
            >
              /admin
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
