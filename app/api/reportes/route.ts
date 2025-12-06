import { NextResponse } from "next/server";

const API_KEY = process.env.AIRTABLE_API_KEY!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE = process.env.AIRTABLE_TABLE_REPORTES || "Reportes Diarios";

const API_URL = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(
  TABLE
)}`;

// Nombres de campos EXACTOS en Airtable
const FIELD_FECHA = "Fecha";
const FIELD_SUPERVISOR = "Supervisores";
const FIELD_PROYECTO = "Proyectos";

const FIELD_FABRICACION = "Fabricación – actividades";
const FIELD_INSTALACION = "Instalación – actividades";
const FIELD_SUPERVISION = "Supervisión – actividades";

const FIELD_M2 = "m² instalados";
const FIELD_PIEZAS = "Piezas colocadas";
const FIELD_SELLOS = "Sellos ejecutados";
const FIELD_POSTES = "Postes ajustados";

const FIELD_TIEMPO_MUERTO = "Tiempo muerto";
const FIELD_TIEMPO_MUERTO_OTRO = "Tiempo muerto – otro";
const FIELD_PENDIENTE = "Pendiente";
const FIELD_PENDIENTE_OTRO = "Pendiente – otro";

const FIELD_FOTOS = "Fotos";

const FIELD_AREA_NIVEL = "Área o nivel";
const FIELD_M2_CRISTAL = "m² cristal";
const FIELD_M2_ALUMINIO = "m² aluminio";
const FIELD_ML_SELLO_INTERIOR = "ML sello interior";
const FIELD_ML_SELLO_EXTERIOR = "ML sello exterior";
const FIELD_PUERTAS_COLOCADAS = "Puertas colocadas";

// Checkbox de confirmación
const FIELD_CONFIRMADO = "Confirmado por supervisor";

// Pequeña ayuda para detectar IDs tipo recXXXXXXXX
function looksLikeRecordId(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith("rec");
}

// --------------------------------------------------
// GET: listar reportes para el panel de admin
// --------------------------------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(100, Math.max(1, Number(limitParam)))
      : 50;

    const url = `${API_URL}?pageSize=${limit}&sort[0][field]=${encodeURIComponent(
      FIELD_FECHA
    )}&sort[0][direction]=desc`;

    const airtableRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      cache: "no-store",
    });

    const airtableData = await airtableRes.json();

    if (!airtableRes.ok) {
      console.error("Airtable GET error:", airtableData);
      return NextResponse.json(
        { ok: false, error: "Error al cargar reportes desde Airtable." },
        { status: 500 }
      );
    }

    const records =
      (airtableData.records || []).map((rec: any) => {
        const f = rec.fields || {};

        const rawProyectos = f[FIELD_PROYECTO];

        // -----------------------------
        // Buscar dinámicamente el campo
        // cuyo nombre comience con
        // "Nombre del proyecto"
        // -----------------------------
        const fieldNames = Object.keys(f);
        const lookupKey = fieldNames.find((name) =>
          name.startsWith("Nombre del proyecto")
        );

        const rawLookup = lookupKey ? f[lookupKey] : undefined;

        let proyectoNombre: string | null = null;

        // 1) Intentar con el lookup encontrado
        if (Array.isArray(rawLookup) && rawLookup.length > 0) {
          proyectoNombre = String(rawLookup[0]);
        } else if (typeof rawLookup === "string") {
          proyectoNombre = rawLookup;
        }

        // 2) Si el lookup está vacío, usamos Proyectos (lo que devuelva Airtable)
        if (!proyectoNombre) {
          if (Array.isArray(rawProyectos) && rawProyectos.length > 0) {
            proyectoNombre = String(rawProyectos[0]);
          } else if (typeof rawProyectos === "string") {
            proyectoNombre = rawProyectos;
          }
        }

        // 3) Si parece un recId y tenemos otra cosa más "humana", la usamos
        const proyectosTexto =
          Array.isArray(rawProyectos) && rawProyectos.length > 0
            ? String(rawProyectos[0])
            : typeof rawProyectos === "string"
            ? rawProyectos
            : null;

        if (
          looksLikeRecordId(proyectoNombre) &&
          proyectosTexto &&
          !looksLikeRecordId(proyectosTexto)
        ) {
          proyectoNombre = proyectosTexto;
        }

        // Normalizar proyectos a array de strings (IDs)
        const proyectosNorm: string[] = Array.isArray(rawProyectos)
          ? (rawProyectos as string[])
          : rawProyectos
          ? [String(rawProyectos)]
          : [];

        return {
          id: rec.id,
          fecha: f[FIELD_FECHA] ?? null,
          supervisores: (f[FIELD_SUPERVISOR] as string[]) || [],
          confirmado: Boolean(f[FIELD_CONFIRMADO]),

          proyectos: proyectosNorm,
          proyectoNombre,

          fabricacion: (f[FIELD_FABRICACION] as string[]) || [],
          instalacion: (f[FIELD_INSTALACION] as string[]) || [],
          supervision: (f[FIELD_SUPERVISION] as string[]) || [],

          m2Instalados: f[FIELD_M2] ?? null,
          piezasColocadas: f[FIELD_PIEZAS] ?? null,
          sellosEjecutados: f[FIELD_SELLOS] ?? null,
          postesAjustados: f[FIELD_POSTES] ?? null,

          tiempoMuerto: f[FIELD_TIEMPO_MUERTO] ?? null,
          tiempoMuertoOtro: f[FIELD_TIEMPO_MUERTO_OTRO] ?? null,

          areaNivel: f[FIELD_AREA_NIVEL] ?? null,
          m2Cristal: f[FIELD_M2_CRISTAL] ?? null,
          m2Aluminio: f[FIELD_M2_ALUMINIO] ?? null,
          mlSelloInterior: f[FIELD_ML_SELLO_INTERIOR] ?? null,
          mlSelloExterior: f[FIELD_ML_SELLO_EXTERIOR] ?? null,
          puertasColocadas: f[FIELD_PUERTAS_COLOCADAS] ?? null,

          pendiente: f[FIELD_PENDIENTE] ?? null,
          pendienteOtro: f[FIELD_PENDIENTE_OTRO] ?? null,

          fotos: Array.isArray(f[FIELD_FOTOS])
            ? (f[FIELD_FOTOS] as any[]).map((att) => ({ url: att.url }))
            : [],
        };
      }) ?? [];

    return NextResponse.json({ ok: true, records }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/reportes] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Error cargando reportes." },
      { status: 500 }
    );
  }
}

// --------------------------------------------------
// POST: crear reporte desde el formulario del supervisor
// --------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      fecha,
      fabricacion = [],
      instalacion = [],
      supervision = [],
      m2Instalados,
      piezasColocadas,
      sellosEjecutados,
      postesAjustados,
      tiempoMuerto,
      tiempoMuertoOtro,
      pendiente,
      pendienteOtro,
      supervisorId,
      proyectoId,
      evidenciaFotos,
      areaNivel,
      m2Cristal,
      m2Aluminio,
      mlSelloInterior,
      mlSelloExterior,
      puertasColocadas,
    } = body as {
      fecha: string;
      fabricacion?: string[];
      instalacion?: string[];
      supervision?: string[];
      m2Instalados?: string | number | null;
      piezasColocadas?: string | number | null;
      sellosEjecutados?: string | number | null;
      postesAjustados?: string | number | null;
      tiempoMuerto?: string | null;
      tiempoMuertoOtro?: string | null;
      pendiente?: string | null;
      pendienteOtro?: string | null;
      supervisorId?: string | null;
      proyectoId?: string | null;
      evidenciaFotos?: string[];
      areaNivel?: string | null;
      m2Cristal?: string | number | null;
      m2Aluminio?: string | number | null;
      mlSelloInterior?: string | number | null;
      mlSelloExterior?: string | number | null;
      puertasColocadas?: string | number | null;
    };

    const attachments =
      (evidenciaFotos || []).map((url: string) => ({ url })) ?? [];

    const fields: Record<string, any> = {};

    if (fecha) fields[FIELD_FECHA] = fecha;
    if (supervisorId) fields[FIELD_SUPERVISOR] = [supervisorId];
    if (proyectoId) fields[FIELD_PROYECTO] = [proyectoId];

    fields[FIELD_FABRICACION] = fabricacion;
    fields[FIELD_INSTALACION] = instalacion;
    fields[FIELD_SUPERVISION] = supervision;

    if (m2Instalados) fields[FIELD_M2] = Number(m2Instalados);
    if (piezasColocadas) fields[FIELD_PIEZAS] = Number(piezasColocadas);
    if (sellosEjecutados) fields[FIELD_SELLOS] = Number(sellosEjecutados);
    if (postesAjustados) fields[FIELD_POSTES] = Number(postesAjustados);

    if (tiempoMuerto) fields[FIELD_TIEMPO_MUERTO] = tiempoMuerto;
    if (tiempoMuertoOtro) fields[FIELD_TIEMPO_MUERTO_OTRO] = tiempoMuertoOtro;
    if (pendiente) fields[FIELD_PENDIENTE] = pendiente;
    if (pendienteOtro) fields[FIELD_PENDIENTE_OTRO] = pendienteOtro;

    if (attachments.length > 0) {
      fields[FIELD_FOTOS] = attachments;
    }

    if (areaNivel) fields[FIELD_AREA_NIVEL] = areaNivel;
    if (m2Cristal) fields[FIELD_M2_CRISTAL] = Number(m2Cristal);
    if (m2Aluminio) fields[FIELD_M2_ALUMINIO] = Number(m2Aluminio);
    if (mlSelloInterior)
      fields[FIELD_ML_SELLO_INTERIOR] = Number(mlSelloInterior);
    if (mlSelloExterior)
      fields[FIELD_ML_SELLO_EXTERIOR] = Number(mlSelloExterior);
    if (puertasColocadas)
      fields[FIELD_PUERTAS_COLOCADAS] = Number(puertasColocadas);

    const airtablePayload = {
      records: [{ fields }],
    };

    const airtableRes = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(airtablePayload),
    });

    const airtableData = await airtableRes.json();

    if (!airtableRes.ok) {
      console.error("Airtable POST error:", airtableData);
      return NextResponse.json(
        {
          ok: false,
          error: "Error al guardar en Airtable.",
          details: airtableData,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        record: airtableData.records?.[0] ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/reportes] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno al guardar la bitácora." },
      { status: 500 }
    );
  }
}
