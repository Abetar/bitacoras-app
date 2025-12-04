import { NextResponse } from "next/server";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_SUPERVISORES =
  process.env.AIRTABLE_TABLE_SUPERVISORES || "Supervisores";
const TABLE_PROYECTOS =
  process.env.AIRTABLE_TABLE_PROYECTOS || "Proyectos";

const FIELD_SUP_NOMBRE = "Nombre";
const FIELD_SUP_PROYECTOS = "Proyectos asignados"; // link en Supervisores
const FIELD_PROY_NOMBRE = "Nombre del proyecto"; // ajusta si tu tabla Proyectos usa otro nombre

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Falta el parámetro 'id'." },
        { status: 400 }
      );
    }

    // 1) Traer supervisor por Record ID directo
    const supRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
        TABLE_SUPERVISORES
      )}/${id}`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    const supData = await supRes.json();

    if (!supRes.ok) {
      console.error("Airtable supervisor error:", supData);
      return NextResponse.json(
        { ok: false, error: "Supervisor no encontrado." },
        { status: 404 }
      );
    }

    const fields = supData.fields || {};
    const supervisorName = fields[FIELD_SUP_NOMBRE] || "";
    const proyectoIds: string[] = fields[FIELD_SUP_PROYECTOS] || [];

    let proyectos: { id: string; nombre: string }[] = [];

    // 2) Si tiene proyectos asignados, traer sus nombres
    if (proyectoIds.length > 0) {
      const filterFormula = `OR(${proyectoIds
        .map((pid) => `RECORD_ID()='${pid}'`)
        .join(",")})`;

      const projUrl = new URL(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
          TABLE_PROYECTOS
        )}`
      );
      projUrl.searchParams.set("filterByFormula", filterFormula);
      projUrl.searchParams.set("pageSize", String(proyectoIds.length));

      const projRes = await fetch(projUrl.toString(), {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });

      const projData = await projRes.json();

      if (projRes.ok) {
        proyectos = (projData.records || []).map((r: any) => ({
          id: r.id,
          nombre: r.fields[FIELD_PROY_NOMBRE] || r.id,
        }));
      } else {
        console.error("Airtable proyectos error:", projData);
      }
    }

    return NextResponse.json({
      ok: true,
      supervisorId: supData.id,
      supervisorName,
      proyectos,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}
