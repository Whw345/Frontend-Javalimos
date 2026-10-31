import PDFDocument from "pdfkit";
import { mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { finished } from "node:stream/promises";

const directory = new URL("../fixtures/", import.meta.url);
await mkdir(directory, { recursive: true });
const samples = {
  "silabo.pdf": [
    "Silabo de Biologia - material ficticio",
    "Semana 1: Celulas y organelos",
    "Semana 2: Fotosintesis",
  ],
  "teoria.pdf": [
    "Celulas y organelos",
    "La mitocondria produce ATP mediante la respiracion celular.",
    "El nucleo contiene el ADN de la celula.",
    "Los ribosomas participan en la sintesis de proteinas.",
  ],
  "vacio.pdf": [""],
};
for (const [name, lines] of Object.entries(samples)) {
  const document = new PDFDocument({ compress: false });
  const output = createWriteStream(new URL(name, directory));
  document.pipe(output);
  for (const line of lines) document.fontSize(14).text(line, { paragraphGap: 10 });
  document.end();
  await finished(output);
}
console.log("PDF fixtures written to fixtures/.");
