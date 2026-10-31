import "server-only";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_PDF_BYTES, MAX_PDF_MB } from "@/lib/config";
import { HttpError } from "./errors";

export async function extractPdf(file: File): Promise<string> {
  if (file.size === 0 || file.size > MAX_PDF_BYTES) {
    throw new HttpError(
      413,
      "INVALID_SIZE",
      `El PDF debe tener contenido y pesar como máximo ${MAX_PDF_MB} MB.`,
    );
  }
  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
    throw new HttpError(415, "INVALID_PDF", "Selecciona un archivo PDF.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw new HttpError(415, "INVALID_PDF", "El archivo no contiene un PDF válido.");
  }
  const directory = await mkdtemp(join(tmpdir(), "javalimos-pdf-"));
  try {
    const path = join(directory, "document.pdf");
    await writeFile(path, buffer);
    const [{ default: Markitdown, DocumentConverter }, { PDFParse }] = await Promise.all([
      import("markitdown-js"),
      import("pdf-parse"),
    ]);
    // The bundled PDF.js 1.x parser fails on valid PDFKit files in Node 22.
    // Use MarkItDown's public converter extension API with the maintained parser.
    class NodePdfConverter extends DocumentConverter {
      async convert(localPath: string) {
        const parser = new PDFParse({ data: await readFile(localPath) });
        try {
          const text = await parser.getText();
          return { title: null, textContent: text.pages.map((page) => page.text).join("\n\n") };
        } finally {
          await parser.destroy();
        }
      }
    }
    const converter = new Markitdown();
    converter.registerConverter(new NodePdfConverter(-1));
    const result = await converter.convert(path);
    const markdown = result?.textContent?.trim() ?? "";
    if (markdown.length < 20)
      throw new HttpError(
        422,
        "EMPTY_PDF",
        "El PDF no tiene texto suficiente. Usa un PDF con texto seleccionable.",
      );
    if (markdown.length > 120_000)
      throw new HttpError(422, "PDF_TOO_LONG", "Divide el material en documentos más pequeños.");
    return markdown;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      422,
      "PDF_EXTRACTION_FAILED",
      "No se pudo leer el PDF. Comprueba que no esté dañado ni protegido.",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
