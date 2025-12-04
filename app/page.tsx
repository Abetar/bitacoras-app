import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-6">
      {/* Logo o título */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          Sistema de Bitácoras
        </h1>
        <p className="text-gray-600 mt-2">
          Selecciona cómo deseas continuar
        </p>
      </div>

      {/* Botones de acceso */}
      <div className="w-full max-w-xs space-y-4">

        <Link
          href="/supervisor"
          className="block bg-blue-600 text-white text-center py-3 rounded-xl text-lg font-semibold shadow hover:bg-blue-700 transition"
        >
          Entrar como Supervisor
        </Link>

        <Link
          href="/admin"
          className="block bg-gray-800 text-white text-center py-3 rounded-xl text-lg font-semibold shadow hover:bg-gray-900 transition"
        >
          Entrar como Administrador
        </Link>

      </div>

      {/* Footer opcional */}
      <p className="text-xs text-gray-400 mt-10">
        © {new Date().getFullYear()} – Bitácoras de Obra
      </p>
    </div>
  );
}
