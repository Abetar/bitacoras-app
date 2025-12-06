// lib/uploadImage.ts
// Helper para subir una imagen a Cloudinary usando un preset unsigned

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !preset) {
    console.error("Cloudinary env vars missing");
    throw new Error("Faltan variables de entorno de Cloudinary");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("Cloudinary upload error:", data);
    throw new Error("Error al subir imagen a Cloudinary");
  }

  // secure_url es la URL HTTPS final de la imagen
  return data.secure_url as string;
}
