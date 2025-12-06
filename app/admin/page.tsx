"use client";

import { useEffect, useMemo, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type ReporteAdmin = {
  id: string;
  fecha: string | null;
  supervisores: string[];
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
  fotos?: { url: string }[] | null;
  areaNivel?: string | null;
  m2Cristal?: number | null;
  m2Aluminio?: number | null;
  mlSelloInterior?: number | null;
  mlSelloExterior?: number | null;
  puertasColocadas?: number | null;

  // proyecto
  proyectos?: string[]; // IDs de proyectos (link en Airtable)
  proyectoNombre?: string | null; // Nombre del proyecto (lookup)
};

type SupervisorItem = {
  id: string;
  nombre: string;
  activo: boolean;
};

export default function AdminPage() {
  const [reportes, setReportes] = useState<ReporteAdmin[]>([]);
  const [supervisores, setSupervisores] = useState<SupervisorItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // filtros
  const [search, setSearch] = useState("");
  const [soloConIncidencias, setSoloConIncidencias] = useState(false);
  const [supervisorFilter, setSupervisorFilter] = useState<string>("");

  const supervisorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of supervisores) map[s.id] = s.nombre || s.id;
    return map;
  }, [supervisores]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);

        const [repRes, supRes] = await Promise.all([
          fetch("/api/reportes?limit=200", { cache: "no-store" }),
          fetch("/api/supervisores", { cache: "no-store" }),
        ]);

        const repData = await repRes.json();
        const supData = await supRes.json();

        if (!repData.ok) {
          console.error(repData);
          setErrorMsg("Error cargando reportes.");
          return;
        }

        if (!supData.ok) {
          console.error(supData);
          setErrorMsg("Error cargando supervisores.");
          return;
        }

        setReportes(repData.records || []);
        setSupervisores(
          (supData.records || []).filter((s: SupervisorItem) => s.nombre)
        );
      } catch (e) {
        console.error(e);
        setErrorMsg("No se pudo conectar al servidor.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const filteredReportes = reportes.filter((r) => {
    let ok = true;

    if (soloConIncidencias) {
      const inc =
        (r.tiempoMuerto && r.tiempoMuerto !== "Ninguno") ||
        (r.pendiente && r.pendiente !== "Ninguno");
      if (!inc) ok = false;
    }

    if (supervisorFilter) {
      if (!r.supervisores?.includes(supervisorFilter)) ok = false;
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      const blob = `${r.fecha ?? ""} ${r.tiempoMuerto ?? ""} ${
        r.pendiente ?? ""
      }`.toLowerCase();
      if (!blob.includes(term)) ok = false;
    }

    return ok;
  });

  // -------------------------------------------------------------
  // PDF EXPORT (con nombre de supervisor, proyecto y logo)
  // -------------------------------------------------------------
  async function exportarPDF(
    reporte: ReporteAdmin,
    supervisorNombre: string,
    proyectoNombre: string
  ) {
    try {
      const pdf = await PDFDocument.create();

      // 1) Intentar cargar el logo JPG desde /public/cw-logo.jpg
      let logoImage = null;
      try {
        const logoRes = await fetch("/cw-logo.jpg");
        if (logoRes.ok) {
          const logoBytes = await logoRes.arrayBuffer();
          // aquí usamos JPG porque tu archivo es .jpg
          logoImage = await pdf.embedJpg(logoBytes);
        } else {
          console.warn("No se pudo cargar el logo /cw-logo.jpg");
        }
      } catch (err) {
        console.warn("Error cargando logo:", err);
      }

      const page = pdf.addPage();
      const { width, height } = page.getSize();

      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

      // 2) Dibujar el logo (si se cargó correctamente)
      let topOffset = 50; // margen superior base
      if (logoImage) {
        const desiredLogoWidth = 140; // ajusta el tamaño a tu gusto
        const scale = desiredLogoWidth / logoImage.width;
        const logoWidth = logoImage.width * scale;
        const logoHeight = logoImage.height * scale;

        page.drawImage(logoImage, {
          x: width - logoWidth - 50, // margen derecho
          y: height - logoHeight - 30, // un poco abajo del borde superior
          width: logoWidth,
          height: logoHeight,
        });

        // dejamos espacio extra debajo del logo
        topOffset = 60 + logoHeight;
      } else {
        console.warn("Logo no embebido, se generará PDF sin membrete.");
      }

      let y = height - topOffset;

      const line = (text: string, isBold = false, size = 12) => {
        page.drawText(text, {
          x: 50,
          y,
          size,
          font: isBold ? bold : font,
          color: rgb(0, 0, 0),
        });
        y -= 16;
      };

      // HEADER
      page.drawText("BITÁCORA DIARIA", {
        x: 50,
        y,
        size: 18,
        font: bold,
        color: rgb(0, 0, 0),
      });
      y -= 28;

      line(`Fecha: ${reporte.fecha ?? "—"}`);
      line(`Supervisor: ${supervisorNombre || "—"}`);
      line(`Proyecto: ${proyectoNombre || "—"}`);
      line(`ID reporte: ${reporte.id}`);
      y -= 10;

      page.drawLine({
        start: { x: 50, y },
        end: { x: 550, y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 20;

      // ACTIVIDADES
      line("ACTIVIDADES", true, 14);

      line("Fabricación:", true);
      (reporte.fabricacion ?? []).forEach((a) => line(`• ${a}`));
      if (!reporte.fabricacion?.length) line("• Sin actividades");

      y -= 4;
      line("Instalación:", true);
      (reporte.instalacion ?? []).forEach((a) => line(`• ${a}`));
      if (!reporte.instalacion?.length) line("• Sin actividades");

      y -= 4;
      line("Supervisión:", true);
      (reporte.supervision ?? []).forEach((a) => line(`• ${a}`));
      if (!reporte.supervision?.length) line("• Sin actividades");

      y -= 10;
      line("MÉTRICAS", true, 14);
      if (reporte.areaNivel) {
        line(`• Área / nivel: ${reporte.areaNivel}`);
      }
      line(`• m² de cristal: ${reporte.m2Cristal ?? "—"}`);
      line(`• m² de aluminio: ${reporte.m2Aluminio ?? "—"}`);
      line(`• ML de sello interior: ${reporte.mlSelloInterior ?? "—"}`);
      line(`• ML de sello exterior: ${reporte.mlSelloExterior ?? "—"}`);
      line(`• Puertas colocadas: ${reporte.puertasColocadas ?? "—"}`);

      y -= 10;
      line("INCIDENCIAS", true, 14);
      line(`• Tiempo muerto: ${reporte.tiempoMuerto || "Ninguno"}`);
      if (reporte.tiempoMuertoOtro) line(`  - ${reporte.tiempoMuertoOtro}`);
      line(`• Pendiente: ${reporte.pendiente || "Ninguno"}`);
      if (reporte.pendienteOtro) line(`  - ${reporte.pendienteOtro}`);

      // FOTOS EN PÁGINAS NUEVAS (igual que ya lo tenías)
      const fotos = reporte.fotos ?? [];

      for (const foto of fotos) {
        try {
          const res = await fetch(foto.url);
          if (!res.ok) {
            console.warn("No se pudo descargar la imagen:", foto.url);
            continue;
          }

          const contentType = res.headers.get("Content-Type") || "";
          const imgBuffer = await res.arrayBuffer();

          let image;
          if (contentType.includes("jpeg") || contentType.includes("jpg")) {
            image = await pdf.embedJpg(imgBuffer);
          } else {
            image = await pdf.embedPng(imgBuffer);
          }

          const imgPage = pdf.addPage();
          const { width: pw, height: ph } = imgPage.getSize();

          const maxWidth = pw - 100;
          const maxHeight = ph - 200;
          const scale = Math.min(
            maxWidth / image.width,
            maxHeight / image.height
          );

          const imgWidth = image.width * scale;
          const imgHeight = image.height * scale;
          const x = (pw - imgWidth) / 2;
          const yImg = (ph - imgHeight) / 2;

          imgPage.drawText("Evidencia fotográfica", {
            x: 50,
            y: ph - 50,
            size: 16,
            font: bold,
          });

          imgPage.drawImage(image, {
            x,
            y: yImg,
            width: imgWidth,
            height: imgHeight,
          });
        } catch (err) {
          console.error("Error embebiendo imagen en PDF:", foto.url, err);
        }
      }

      const bytes = await pdf.save();
      const blob = new Blob([bytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `bitacora-${reporte.fecha || reporte.id}.pdf`;
      a.click();
    } catch (err) {
      console.error("Error generando PDF completo:", err);
      alert(
        "Ocurrió un error al generar el PDF. Revisa la consola para más detalles."
      );
    }
  }

  // --------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* CONTROLES */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Panel de reportes</h1>
            <p className="text-sm text-slate-600">
              Revisión general de bitácoras enviadas por supervisores.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value)}
              className="border rounded px-3 py-2 bg-white text-sm"
            >
              <option value="">Todos los supervisores</option>
              {supervisores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>

            <input
              placeholder="Buscar por fecha o incidencia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-2 bg-white text-sm"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={soloConIncidencias}
                onChange={(e) => setSoloConIncidencias(e.target.checked)}
              />
              Con incidencias
            </label>
          </div>
        </header>

        {loading && <p>Cargando...</p>}
        {errorMsg && <p className="text-red-500">{errorMsg}</p>}

        {!loading && !errorMsg && filteredReportes.length === 0 && (
          <p className="text-slate-500">No hay reportes.</p>
        )}

        {/* LISTA DE REPORTES */}
        {!loading && !errorMsg && filteredReportes.length > 0 && (
          <div className="space-y-4">
            {filteredReportes.map((r) => {
              const supId = r.supervisores?.[0];
              const supName = supervisorMap[supId] || "—";
              const projName = r.proyectoNombre || "—";
              const fotos = r.fotos ?? [];

              return (
                <article
                  key={r.id}
                  className="bg-white rounded-xl shadow p-4 border space-y-3"
                >
                  {/* HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">
                        {r.fecha ? new Date(r.fecha).toLocaleDateString() : "—"}
                      </h2>
                      <p className="text-xs text-slate-500">
                        ID: <span className="font-mono">{r.id}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Supervisor:{" "}
                        <span className="font-semibold">{supName}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Proyecto:{" "}
                        <span className="font-semibold">{projName}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => exportarPDF(r, supName, projName)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                    >
                      Exportar PDF
                    </button>
                  </div>

                  {/* ACTIVIDADES */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-slate-700">
                        Fabricación
                      </p>
                      {r.fabricacion.length ? (
                        <ul className="list-disc ml-4">
                          {r.fabricacion.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400">Sin actividades</p>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-700">
                        Instalación
                      </p>
                      {r.instalacion.length ? (
                        <ul className="list-disc ml-4">
                          {r.instalacion.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400">Sin actividades</p>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-700">
                        Supervisión
                      </p>
                      {r.supervision.length ? (
                        <ul className="list-disc ml-4">
                          {r.supervision.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400">Sin actividades</p>
                      )}
                    </div>
                  </div>

                  {/* METRICAS */}
                  <div className="border rounded p-3 text-xs bg-slate-50">
                    {r.areaNivel && <p>Área / nivel: {r.areaNivel}</p>}
                    <p>m² de cristal: {r.m2Cristal ?? "—"}</p>
                    <p>m² de aluminio: {r.m2Aluminio ?? "—"}</p>
                    <p>ML de sello interior: {r.mlSelloInterior ?? "—"}</p>
                    <p>ML de sello exterior: {r.mlSelloExterior ?? "—"}</p>
                    <p>Puertas colocadas: {r.puertasColocadas ?? "—"}</p>
                  </div>

                  {/* INCIDENCIAS */}
                  <div className="border rounded p-3 text-xs bg-slate-50">
                    <p className="font-semibold text-slate-700">Incidencias</p>
                    <p>Tiempo muerto: {r.tiempoMuerto || "Ninguno"}</p>
                    {r.tiempoMuertoOtro && (
                      <p className="ml-3">• {r.tiempoMuertoOtro}</p>
                    )}
                    <p className="mt-1">
                      Pendiente: {r.pendiente || "Ninguno"}
                    </p>
                    {r.pendienteOtro && (
                      <p className="ml-3">• {r.pendienteOtro}</p>
                    )}
                  </div>

                  {/* FOTOS */}
                  {fotos.length > 0 && (
                    <div>
                      <p className="font-semibold text-xs text-slate-700 mb-2">
                        Evidencia fotográfica
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {fotos.map((f, i) => (
                          <img
                            key={i}
                            src={f.url}
                            className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => setSelectedImage(f.url)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* POPUP IMAGEN */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              className="max-w-[95%] max-h-[95%] rounded-lg shadow-xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}
