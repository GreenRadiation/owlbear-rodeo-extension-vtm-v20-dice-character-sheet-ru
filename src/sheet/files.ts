/** Offer a text as a file to save */
export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}

/** Read the text of a file the player picked */
export function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** A name that is safe to use as a part of a file name */
export function toFileName(name: string, fallback: string) {
  const safe = name.trim().replace(/[\\/:*?"<>|\s]+/g, "_");
  return safe || fallback;
}
