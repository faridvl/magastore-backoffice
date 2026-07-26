/**
 * Descarga un PDF generado por la API respetando el nombre que define el
 * servidor en `Content-Disposition`.
 *
 * El atributo `download` de un <a> gana sobre la cabecera del servidor, así que
 * si cada pantalla arma su propio nombre el del backend nunca se aplica. Acá se
 * lee la cabecera y el nombre queda definido en un solo lugar: los handlers de
 * `pages/api/billing/`.
 */

/** Extrae el filename de una cabecera Content-Disposition. */
const parseFileName = (header: string | null): string | null => {
  if (!header) return null;

  // Formato RFC 5987 (`filename*=UTF-8''nombre.pdf`), que tiene prioridad.
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // Cae al formato simple si el valor viene mal codificado.
    }
  }

  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1]?.trim() || null;
};

/**
 * Pide el PDF y dispara la descarga.
 *
 * @param url        endpoint que devuelve el PDF
 * @param fallbackName nombre a usar solo si el servidor no manda cabecera
 * @throws si la respuesta no es OK — cada pantalla decide cómo notificar
 */
export const downloadPdf = async (url: string, fallbackName: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudo generar el PDF');

  const fileName = parseFileName(response.headers.get('Content-Disposition')) ?? fallbackName;

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
};
