"use client";

import { useEffect, useMemo, useState } from "react";

type ReporteAdmin = {
  id: string;
  fecha: string | null;
  supervisores: string[]; // record IDs
  confirmado: boolean;
  fabricacion: string[];
  instalacion: string[];
  supervision: string[];
  m2Instalados: number | null;
  piezasColocadas: number | null;
  sellosEjecutados: number | null;
  postesAjustados: number | null;
  tiempoMuerto: string | null;
  tiempoMuertoOtro: string | null;
  pendiente: string | null;
  pendienteOtro: string | null;
};

type SupervisorItem = {
  id: string;
  nombre: string;
  activo: boolean;
};

export default function AdminPage() {
  const [reportes, setReportes] = useState<ReporteAdmin[]>([]);
  const [supervisores, setSupervisores] = useState<SupervisorItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [soloConIncidencias, setSoloConIncidencias] = useState(false);
  const [supervisorFilter, setSupervisorFilter] = useState<string>("");

  // Mapa id → nombre para lookup rápido
  const supervisorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of supervisores) {
      map[s.id] = s.nombre || s.id;
    }
    return map;
  }, [supervisores]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const [repRes, supRes] = await Promise.all([
          fetch("/api/reportes?limit=100", { cache: "no-store" }),
          fetch("/api/supervisores", { cache: "no-store" }),
        ]);

        const repData = await repRes.json();
        const supData = await supRes.json();

        if (!repRes.ok || !repData.ok) {
          console.error("Error cargando reportes:", repData);
          setErrorMsg("No se pudieron cargar los reportes.");
          return;
        }

        if (!supRes.ok || !supData.ok) {
          console.error("Error cargando supervisores:", supData);
          setErrorMsg("No se pudieron cargar los supervisores.");
          return;
        }

        setReportes(repData.records || []);

        // Solo supervisores activos y con nombre
        const activos: SupervisorItem[] = (supData.records || []).filter(
          (s: SupervisorItem) => s.nombre
        );
        setSupervisores(activos);
      } catch (err) {
        console.error(err);
        setErrorMsg("Error de conexión al cargar la información.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const filteredReportes = reportes.filter((r) => {
    let passes = true;

    if (soloConIncidencias) {
      const tieneIncidencia =
        (r.tiempoMuerto && r.tiempoMuerto !== "Ninguno") ||
        (r.pendiente && r.pendiente !== "Ninguno");
      if (!tieneIncidencia) passes = false;
    }

    if (supervisorFilter) {
      if (!r.supervisores || !r.supervisores.includes(supervisorFilter)) {
        passes = false;
      }
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      const text =
        `${r.fecha ?? ""} ${r.tiempoMuerto ?? ""} ${r.pendiente ?? ""}`.toLowerCase();
      if (!text.includes(term)) passes = false;
    }

    return passes;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel de reportes</h1>
            <p className="text-sm text-slate-600">
              Vista general de las bitácoras diarias enviadas por supervisores.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Filtro por supervisor */}
            <select
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white w-full sm:w-52"
            >
              <option value="">Todos los supervisores</option>
              {supervisores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>

            {/* Buscar por texto */}
            <input
              type="text"
              placeholder="Buscar por fecha o comentario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full sm:w-64 bg-white"
            />

            {/* Solo incidencias */}
            <label className="flex items-center gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={soloConIncidencias}
                onChange={(e) => setSoloConIncidencias(e.target.checked)}
              />
              Solo con incidencias / pendientes
            </label>
          </div>
        </header>

        {loading && (
          <p className="text-sm text-slate-600">Cargando reportes...</p>
        )}

        {errorMsg && !loading && (
          <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
        )}

        {!loading && !errorMsg && filteredReportes.length === 0 && (
          <p className="text-sm text-slate-500">
            No hay reportes que coincidan con los filtros.
          </p>
        )}

        {!loading && !errorMsg && filteredReportes.length > 0 && (
          <div className="space-y-3">
            {filteredReportes.map((r) => {
              const supervisorId = r.supervisores?.[0];
              const supervisorName =
                (supervisorId && supervisorMap[supervisorId]) || "—";

              return (
                <article
                  key={r.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">
                        {r.fecha
                          ? new Date(r.fecha).toLocaleDateString()
                          : "—"}
                      </h2>
                      <p className="text-xs text-slate-500">
                        ID reporte:{" "}
                        <span className="font-mono">{r.id}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Supervisor:{" "}
                        <span className="font-semibold">
                          {supervisorName}
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          r.confirmado
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.confirmado ? "Confirmado" : "Sin confirmar"}
                      </span>

                      {(r.tiempoMuerto && r.tiempoMuerto !== "Ninguno") ||
                      (r.pendiente && r.pendiente !== "Ninguno") ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Incidencias
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Sin incidencias
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actividades */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">
                        Fabricación
                      </p>
                      {r.fabricacion.length ? (
                        <ul className="list-disc ml-4 space-y-0.5">
                          {r.fabricacion.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400">Sin actividades</p>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-700 mb-1">
                        Instalación
                      </p>
                      {r.instalacion.length ? (
                        <ul className="list-disc ml-4 space-y-0.5">
                          {r.instalacion.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400">Sin actividades</p>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-700 mb-1">
                        Supervisión
                      </p>
                      {r.supervision.length ? (
                        <ul className="list-disc ml-4 space-y-0.5">
                          {r.supervision.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400">Sin actividades</p>
                      )}
                    </div>
                  </div>

                  {/* Métricas + incidencias */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
                    <div className="border rounded-lg p-2 bg-slate-50">
                      <p className="font-semibold text-slate-700 mb-1">
                        Métricas
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <p>
                          <span className="font-medium">m² instalados:</span>{" "}
                          {r.m2Instalados ?? "—"}
                        </p>
                        <p>
                          <span className="font-medium">Piezas:</span>{" "}
                          {r.piezasColocadas ?? "—"}
                        </p>
                        <p>
                          <span className="font-medium">Sellos:</span>{" "}
                          {r.sellosEjecutados ?? "—"}
                        </p>
                        <p>
                          <span className="font-medium">Postes:</span>{" "}
                          {r.postesAjustados ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-2 bg-slate-50">
                      <p className="font-semibold text-slate-700 mb-1">
                        Incidencias / pendientes
                      </p>
                      <p>
                        <span className="font-medium">Tiempo muerto:</span>{" "}
                        {r.tiempoMuerto || "Ninguno"}
                      </p>
                      {r.tiempoMuertoOtro && (
                        <p className="ml-3">• {r.tiempoMuertoOtro}</p>
                      )}

                      <p className="mt-1">
                        <span className="font-medium">Pendiente:</span>{" "}
                        {r.pendiente || "Ninguno"}
                      </p>
                      {r.pendienteOtro && (
                        <p className="ml-3">• {r.pendienteOtro}</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
