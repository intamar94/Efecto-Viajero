// Fotos reales del dispositivo, 100% en el navegador: se redimensionan a
// miniatura (no se guarda la foto a resolución completa: localStorage no
// da para eso) y se intenta leer la fecha real del EXIF de la cámara. Si
// el archivo no trae EXIF (muy habitual tras pasar por redes sociales),
// se usa la fecha de modificación del archivo como aproximación.
export async function miniaturaDeImagen(archivo: File, maxAncho = 480, calidad = 0.55): Promise<string> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, maxAncho / bitmap.width);
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  return canvas.toDataURL("image/jpeg", calidad);
}

export async function fechaDeImagen(archivo: File): Promise<string | undefined> {
  try {
    const exifr = await import("exifr");
    const datos = await exifr.parse(archivo, ["DateTimeOriginal", "CreateDate", "ModifyDate"]);
    const fecha: Date | undefined = datos?.DateTimeOriginal ?? datos?.CreateDate ?? datos?.ModifyDate;
    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
      return fecha.toISOString().slice(0, 10);
    }
  } catch {
    // Sin EXIF legible: seguimos con la fecha de modificación del archivo.
  }
  return new Date(archivo.lastModified).toISOString().slice(0, 10);
}
