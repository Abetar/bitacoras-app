import { NextResponse } from "next/server";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_SUPERVISORES =
  process.env.AIRTABLE_TABLE_SUPERVISORES || "Supervisores";
const TABLE_PROYECTOS =
  process.env.AIRTABLE_TABLE_PROYECTOS || "Proyectos";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing supervisor id" },
        { status: 400 }
      );
    }

    // 1) Obtener supervisor por recordId
    const supRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
        TABLE_SUPERVISORES
      )}/${id}`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!supRes.ok) {
      const text = await supRes.text();
      return NextResponse.json(
        { ok: false, error: `Error fetching supervisor: ${text}` },
        { status: 500 }
      );
    }

    const supData = await supRes.json();

    const supervisorName: string = supData.fields["Nombre"] || "";
    const proyectosAsignados: string[] =
      supData.fields["Proyectos asignados"] || [];

    let proyectoId: string | null = null;
    let proyectoNombre: string | null = null;

    // 2) Si tiene al menos un proyecto asignado, traer nombre
    if (proyectosAsignados.length > 0) {
      proyectoId = proyectosAsignados[0];

      const projRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
          TABLE_PROYECTOS
        )}/${proyectoId}`,
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (projRes.ok) {
        const projData = await projRes.json();
        proyectoNombre = projData.fields["Nombre del proyecto"] || null;
      }
    }

    return NextResponse.json({
      ok: true,
      supervisorId: id,
      supervisorName,
      proyectoId,
      proyectoNombre,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
