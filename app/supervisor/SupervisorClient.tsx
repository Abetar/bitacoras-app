"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { uploadImageToCloudinary } from "@/lib/uploadImage";

type SupervisorInfo = {
  supervisorId: string;
  supervisorName: string;
};

type ProyectoItem = {
  id: string;
  nombre: string;
};

export default function SupervisorClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [info, setInfo] = useState<SupervisorInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [proyectos, setProyectos] = useState<ProyectoItem[]>([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>("");

  // Campos del formulario
  const [fecha, setFecha] = useState("");
  const [actividades, setActividades] = useState<string[]>([]);
  const [m2Instalados, setM2Instalados] = useState<string>("");
  const [piezasColocadas, setPiezasColocadas] = useState<string>("");
  const [sellosEjecutados, setSellosEjecutados] = useState<string>("");
  const [postesAjustados, setPostesAjustados] = useState<string>("");

  const [tiempoMuerto, setTiempoMuerto] = useState("");
  const [tiempoMuertoOtro, setTiempoMuertoOtro] = useState("");
  const [pendiente, setPendiente] = useState("");
  const [pendienteOtro, setPendienteOtro] = useState("");

  const [confirmado, setConfirmado] = useState(false);

  const [areaNivel, setAreaNivel] = useState("");
  const [m2Cristal, setM2Cristal] = useState("");
  const [m2Aluminio, setM2Aluminio] = useState("");
  const [mlSelloInterior, setMlSelloInterior] = useState("");
  const [mlSelloExterior, setMlSelloExterior] = useState("");
  const [puertasColocadas, setPuertasColocadas] = useState("");

  // Toast & errores
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Fotos seleccionadas en el input
  const [fotos, setFotos] = useState<File[]>([]);

  const supervisorId = searchParams.get("user");

  /* Helpers de toast */
  const showErrorToast = (errors: string[]) => {
    setSuccessMessage(null);
    setFormErrors(errors);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
      setFormErrors([]);
    }, 4000);
  };

  const showSuccessToast = (message: string) => {
    setFormErrors([]);
    setSuccessMessage(message);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
      setSuccessMessage(null);
    }, 3500);
  };

  const closeToast = () => {
    setToastVisible(false);
    setFormErrors([]);
    setSuccessMessage(null);
  };

  /* Cargar info del supervisor + proyectos */
  useEffect(() => {
    const loadInfo = async () => {
      if (!supervisorId) {
        router.replace("/");
        return;
      }

      try {
        setLoadingInfo(true);

        const res = await fetch(`/api/supervisor?id=${supervisorId}`);
        const data = await res.json();

        if (!res.ok || !data.ok) {
          router.replace("/");
          return;
        }

        setInfo({
          supervisorId: data.supervisorId,
          supervisorName: data.supervisorName || "",
        });

        const listaProyectos: ProyectoItem[] = data.proyectos || [];
        setProyectos(listaProyectos);

        // Si solo tiene un proyecto, lo preseleccionamos
        if (listaProyectos.length === 1) {
          setProyectoSeleccionado(listaProyectos[0].id);
        }
      } catch (e) {
        console.error(e);
        router.replace("/");
      } finally {
        setLoadingInfo(false);
      }
    };

    loadInfo();
  }, [supervisorId, router]);

  /* Checkboxes de actividades */
  const toggleActividad = (nombre: string) => {
    setActividades((prev) =>
      prev.includes(nombre)
        ? prev.filter((a) => a !== nombre)
        : [...prev, nombre]
    );
  };

  /* Manejo de selección de fotos */
  const handleFotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesArray = Array.from(e.target.files || []);

    if (filesArray.length === 0) {
      setFotos([]);
      return;
    }

    if (filesArray.length > 5) {
      showErrorToast(["Solo puedes subir hasta 5 fotos."]);
      setFotos(filesArray.slice(0, 5));
    } else {
      setFotos(filesArray);
    }
  };

  /* Envío del formulario */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!fecha) {
      errors.push("La fecha del día es obligatoria.");
    }

    if (actividades.length === 0) {
      errors.push("Selecciona al menos una actividad del día.");
    }

    if (proyectos.length > 0 && !proyectoSeleccionado) {
      errors.push("Selecciona el proyecto del día.");
    }

    if (!confirmado) {
      errors.push("Debes confirmar que la información es real y verificable.");
    }

    if (!info?.supervisorId) {
      errors.push("No se pudo identificar al supervisor.");
    }

    if (errors.length > 0) {
      showErrorToast(errors);
      return;
    }

    setSubmitting(true);

    /* 1) Subir fotos a Cloudinary (si hay) */
    let evidenciaFotos: string[] = [];

    try {
      if (fotos.length > 0) {
        const uploads = await Promise.all(
          fotos.map((file) => uploadImageToCloudinary(file))
        );
        evidenciaFotos = uploads;
      }
    } catch (err) {
      console.error("Error subiendo fotos:", err);
      setSubmitting(false);
      showErrorToast([
        "Ocurrió un error al subir las fotos. Intenta de nuevo.",
      ]);
      return;
    }

    /* 2) Enviar reporte a nuestra API */
    try {
      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha,
          actividades,
          m2Instalados,
          piezasColocadas,
          sellosEjecutados,
          postesAjustados,
          tiempoMuerto,
          tiempoMuertoOtro,
          pendiente,
          pendienteOtro,
          supervisorId: info?.supervisorId || null,
          proyectoId: proyectos.length > 0 ? proyectoSeleccionado : null,
          evidenciaFotos, // <- URLs de Cloudinary
          areaNivel,
          m2Cristal,
          m2Aluminio,
          mlSelloInterior,
          mlSelloExterior,
          puertasColocadas,
        }),
      });

      // 👇 Lectura segura de la respuesta (evita el error de JSON vacío)
      let data: any = null;
      let rawText: string | null = null;

      try {
        rawText = await res.text(); // leemos como texto
        data = rawText ? JSON.parse(rawText) : null; // si viene vacío, data = null
      } catch (err) {
        console.error(
          "La respuesta de /api/reportes NO es JSON válido. Texto crudo:",
          rawText
        );
      }

      if (!res.ok || !data || data.ok === false) {
        console.error("Error API:", data);
        showErrorToast([
          data?.error ||
            "Ocurrió un error al enviar el reporte. Intenta de nuevo.",
        ]);
        return;
      }

      // Reset del formulario (menos el proyecto seleccionado)
      setFecha("");
      setActividades([]);
      setM2Instalados("");
      setPiezasColocadas("");
      setSellosEjecutados("");
      setPostesAjustados("");
      setTiempoMuerto("");
      setTiempoMuertoOtro("");
      setPendiente("");
      setPendienteOtro("");
      setConfirmado(false);
      setFotos([]);

      showSuccessToast("Reporte enviado correctamente.");
    } catch (err) {
      console.error(err);
      showErrorToast(["Error de conexión al enviar el reporte."]);
    } finally {
      setSubmitting(false);
    }
  };

  const isSuccessToast = !!successMessage;

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-gray-900">
      {/* TOAST inferior */}
      {toastVisible && (successMessage || formErrors.length > 0) && (
        <div className="fixed inset-x-0 bottom-4 flex justify-center z-50">
          <div
            className={`max-w-md w-[92%] sm:w-full rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 animate-fade-in
            ${isSuccessToast ? "bg-emerald-600" : "bg-red-600"}`}
          >
            <div className="mt-1 text-xl">{isSuccessToast ? "✅" : "⚠️"}</div>
            <div className="flex-1 text-sm text-white">
              <p className="font-semibold mb-1">
                {isSuccessToast ? "¡Listo!" : "Revisa tu formulario"}
              </p>
              {isSuccessToast ? (
                <p>{successMessage}</p>
              ) : (
                <ul className="list-disc ml-4 space-y-0.5">
                  {formErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={closeToast}
              className="ml-2 text-white/80 hover:text-white text-xs font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">
          Bitácora diaria
        </h1>

        {loadingInfo && (
          <p className="text-sm text-gray-500 mb-4">
            Cargando datos del supervisor...
          </p>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* BLOQUE 1 — Datos del día */}
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">Datos del día</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Supervisor
                </label>
                <input
                  type="text"
                  placeholder={
                    loadingInfo ? "Cargando..." : info?.supervisorName || "—"
                  }
                  value={info?.supervisorName || ""}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-700"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">
                Proyecto del día
              </label>

              {proyectos.length === 0 ? (
                <input
                  type="text"
                  readOnly
                  value="Sin proyectos asignados"
                  className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
                />
              ) : (
                <select
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  value={proyectoSeleccionado}
                  onChange={(e) => setProyectoSeleccionado(e.target.value)}
                >
                  <option value="">Selecciona un proyecto</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre || "(Proyecto sin nombre)"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Área o nivel
              </label>
              <input
                type="text"
                value={areaNivel}
                onChange={(e) => setAreaNivel(e.target.value)}
                placeholder="Ej. Nivel 5, Fachada norte..."
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <hr />

          {/* BLOQUE 2 — Actividades */}
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">
              Actividades del día <span className="text-red-500">*</span>
            </h2>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {/* FABRICACIÓN */}
              {[
                "Habilitado",
                "Corte",
                "Armado",
                "Ensamble",
                "Limpieza de piezas",
              ].map((act) => (
                <label
                  key={act}
                  className="flex items-center gap-2 text-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={actividades.includes(act)}
                    onChange={() => toggleActividad(act)}
                  />
                  {act}
                </label>
              ))}

              {/* INSTALACIÓN */}
              {[
                "Colocación de aluminio",
                "Colocación de vidrio",
                "Ajuste de postes",
                "Sellos interior",
                "Sellos exterior",
                "Accesorios",
                "Limpieza",
              ].map((act) => (
                <label
                  key={act}
                  className="flex items-center gap-2 text-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={actividades.includes(act)}
                    onChange={() => toggleActividad(act)}
                  />
                  {act}
                </label>
              ))}

              {/* SUPERVISIÓN */}
              {[
                "Revisión de calidad",
                "Validación de metrado",
                "Coordinación con contratista",
                "Revisión de avances",
              ].map((act) => (
                <label
                  key={act}
                  className="flex items-center gap-2 text-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={actividades.includes(act)}
                    onChange={() => toggleActividad(act)}
                  />
                  {act}
                </label>
              ))}
            </div>
          </div>

          <hr />

          {/* BLOQUE 3 — Métricas */}
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">Métricas</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  m² de cristal
                </label>
                <input
                  type="number"
                  min={0}
                  value={m2Cristal}
                  onChange={(e) => setM2Cristal(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  m² de aluminio
                </label>
                <input
                  type="number"
                  min={0}
                  value={m2Aluminio}
                  onChange={(e) => setM2Aluminio(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  ML de sello interior
                </label>
                <input
                  type="number"
                  min={0}
                  value={mlSelloInterior}
                  onChange={(e) => setMlSelloInterior(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  ML de sello exterior
                </label>
                <input
                  type="number"
                  min={0}
                  value={mlSelloExterior}
                  onChange={(e) => setMlSelloExterior(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Cantidad de puertas colocadas
                </label>
                <input
                  type="number"
                  min={0}
                  value={puertasColocadas}
                  onChange={(e) => setPuertasColocadas(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          <hr />

          {/* BLOQUE 4 — Incidencias */}
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">Incidencias</h2>

            <label className="text-sm font-medium text-gray-700">
              Tiempo muerto
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-gray-900"
              value={tiempoMuerto}
              onChange={(e) => setTiempoMuerto(e.target.value)}
            >
              <option value="">Seleccione tiempo muerto</option>
              <option>Falta de material</option>
              <option>Contratista no llegó</option>
              <option>Obstrucción / interfaz</option>
              <option>Espera de instrucción</option>
              <option>Clima</option>
              <option>Ninguno</option>
              <option>Otro</option>
            </select>

            <input
              type="text"
              placeholder="Si seleccionó 'Otro', describa..."
              className="w-full border rounded-lg px-3 py-2 mt-2 text-gray-900"
              value={tiempoMuertoOtro}
              onChange={(e) => setTiempoMuertoOtro(e.target.value)}
            />

            <label className="text-sm font-medium text-gray-700 mt-4 block">
              Pendientes
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-gray-900"
              value={pendiente}
              onChange={(e) => setPendiente(e.target.value)}
            >
              <option value="">Seleccione un pendiente</option>
              <option>Ajustar sellos</option>
              <option>Falta vidrio</option>
              <option>Revisar alineación</option>
              <option>Remate pendiente</option>
              <option>Limpieza pendiente</option>
              <option>Ninguno</option>
              <option>Otro</option>
            </select>

            <input
              type="text"
              placeholder="Si seleccionó 'Otro', describa..."
              className="w-full border rounded-lg px-3 py-2 mt-2 text-gray-900"
              value={pendienteOtro}
              onChange={(e) => setPendienteOtro(e.target.value)}
            />
          </div>

          <hr />

          {/* BLOQUE 5 — Fotos */}
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">
              Evidencia fotográfica
            </h2>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-700">
                  Sube hasta 5 fotos del día
                </span>
                <span className="inline-block px-3 py-1 rounded-md bg-blue-600 text-white text-sm font-semibold">
                  Seleccionar archivos
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFotosChange}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Fotos generales, detalles, material y pendientes.
              </p>

              {fotos.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-700">
                  {fotos.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border rounded-md px-2 py-1 bg-gray-50"
                    >
                      <span className="truncate max-w-[200px]">
                        {idx + 1}. {file.name}
                      </span>
                      <span className="ml-2">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr />

          {/* VALIDACIÓN FINAL */}
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
            />
            Confirmo que la información es real y verificable.{" "}
            <span className="text-red-500">*</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Enviar reporte"}
          </button>
        </form>
      </div>
    </div>
  );
}
