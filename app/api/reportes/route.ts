import { NextResponse } from "next/server";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_REPORTES =
  process.env.AIRTABLE_TABLE_REPORTES || "Reportes Diarios";

// Nombres EXACTOS de campos en "Reportes Diarios"
const FIELD_FECHA = "Fecha";
const FIELD_SUPERVISOR_LINK = "Supervisores"; // link a Supervisores
const FIELD_PROYECTO_LINK = "Proyecto";       // link a Proyectos
const FIELD_CONFIRMADO = "Confirmado por supervisor";

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

type ReportePayload = {
  fecha: string;
  actividades: string[];
  m2Instalados?: string;
  piezasColocadas?: string;
  sellosEjecutados?: string;
  postesAjustados?: string;
  tiempoMuerto?: string;
  tiempoMuertoOtro?: string;
  pendiente?: string;
  pendienteOtro?: string;
  supervisorId: string | null;
  proyectoId?: string | null;
};

/* ------------------ POST: crear reporte ------------------ */

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReportePayload;

    // Validación mínima
    if (!body.fecha || !body.supervisorId) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos obligatorios en el payload." },
        { status: 400 }
      );
    }

    // Listas para separar actividades según bloque
    const fabricacion = [
      "Habilitado",
      "Corte",
      "Armado",
      "Ensamble",
      "Limpieza de piezas",
    ];
    const instalacion = [
      "Colocación de aluminio",
      "Colocación de vidrio",
      "Ajuste de postes",
      "Sellos interior",
      "Sellos exterior",
      "Accesorios",
      "Limpieza",
    ];
    const supervision = [
      "Revisión de calidad",
      "Validación de metrado",
      "Coordinación con contratista",
      "Revisión de avances",
    ];

    const fabricacionSel = body.actividades.filter((a) =>
      fabricacion.includes(a)
    );
    const instalacionSel = body.actividades.filter((a) =>
      instalacion.includes(a)
    );
    const supervisionSel = body.actividades.filter((a) =>
      supervision.includes(a)
    );

    const fields: Record<string, any> = {
      [FIELD_FECHA]: body.fecha,
      [FIELD_SUPERVISOR_LINK]: [body.supervisorId],
      [FIELD_CONFIRMADO]: true,
    };

    if (body.proyectoId) {
      fields[FIELD_PROYECTO_LINK] = [body.proyectoId];
    }

    if (fabricacionSel.length) {
      fields[FIELD_FABRICACION] = fabricacionSel;
    }
    if (instalacionSel.length) {
      fields[FIELD_INSTALACION] = instalacionSel;
    }
    if (supervisionSel.length) {
      fields[FIELD_SUPERVISION] = supervisionSel;
    }

    if (body.m2Instalados) {
      fields[FIELD_M2] = Number(body.m2Instalados);
    }
    if (body.piezasColocadas) {
      fields[FIELD_PIEZAS] = Number(body.piezasColocadas);
    }
    if (body.sellosEjecutados) {
      fields[FIELD_SELLOS] = Number(body.sellosEjecutados);
    }
    if (body.postesAjustados) {
      fields[FIELD_POSTES] = Number(body.postesAjustados);
    }

    if (body.tiempoMuerto) {
      fields[FIELD_TIEMPO_MUERTO] = body.tiempoMuerto;
    }
    if (body.tiempoMuertoOtro) {
      fields[FIELD_TIEMPO_MUERTO_OTRO] = body.tiempoMuertoOtro;
    }
    if (body.pendiente) {
      fields[FIELD_PENDIENTE] = body.pendiente;
    }
    if (body.pendienteOtro) {
      fields[FIELD_PENDIENTE_OTRO] = body.pendienteOtro;
    }

    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
        TABLE_REPORTES
      )}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Airtable error:", data);
      return NextResponse.json(
        { ok: false, error: "Error al guardar en Airtable." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, recordId: data.id });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/* ------------------ GET: listar reportes para admin ------------------ */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "50");

    const airtableUrl = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
        TABLE_REPORTES
      )}`
    );
    airtableUrl.searchParams.set("pageSize", String(limit));
    airtableUrl.searchParams.set("sort[0][field]", FIELD_FECHA);
    airtableUrl.searchParams.set("sort[0][direction]", "desc");

    const res = await fetch(airtableUrl.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Airtable error (GET reportes):", data);
      return NextResponse.json(
        { ok: false, error: "Error al leer reportes desde Airtable." },
        { status: 500 }
      );
    }

    const records = (data.records || []).map((r: any) => ({
      id: r.id,
      fecha: r.fields[FIELD_FECHA] || null,
      supervisores: r.fields[FIELD_SUPERVISOR_LINK] || [],
      proyectos: r.fields[FIELD_PROYECTO_LINK] || [], // por si luego quieres usarlo
      confirmado: !!r.fields[FIELD_CONFIRMADO],
      fabricacion: r.fields[FIELD_FABRICACION] || [],
      instalacion: r.fields[FIELD_INSTALACION] || [],
      supervision: r.fields[FIELD_SUPERVISION] || [],
      m2Instalados: r.fields[FIELD_M2] ?? null,
      piezasColocadas: r.fields[FIELD_PIEZAS] ?? null,
      sellosEjecutados: r.fields[FIELD_SELLOS] ?? null,
      postesAjustados: r.fields[FIELD_POSTES] ?? null,
      tiempoMuerto: r.fields[FIELD_TIEMPO_MUERTO] || null,
      tiempoMuertoOtro: r.fields[FIELD_TIEMPO_MUERTO_OTRO] || null,
      pendiente: r.fields[FIELD_PENDIENTE] || null,
      pendienteOtro: r.fields[FIELD_PENDIENTE_OTRO] || null,
      rawFields: r.fields,
    }));

    return NextResponse.json({ ok: true, records });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
