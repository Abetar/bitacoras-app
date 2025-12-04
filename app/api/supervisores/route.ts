// app/api/supervisores/route.ts
import { NextResponse } from "next/server";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_SUPERVISORES =
  process.env.AIRTABLE_TABLE_SUPERVISORES || "Supervisores";

const FIELD_NOMBRE = "Nombre";
const FIELD_ACTIVO = "Activo";

export async function GET() {
  try {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
        TABLE_SUPERVISORES
      )}`
    );
    url.searchParams.set("pageSize", "100");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Airtable error (GET supervisores):", data);
      return NextResponse.json(
        { ok: false, error: "Error al leer supervisores desde Airtable." },
        { status: 500 }
      );
    }

    const records = (data.records || []).map((r: any) => ({
      id: r.id, // record ID real de Airtable
      nombre: r.fields[FIELD_NOMBRE] || "",
      activo: !!r.fields[FIELD_ACTIVO],
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
