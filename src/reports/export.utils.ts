import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

export type ExportFormat = "csv" | "excel" | "pdf" | "cwr";

export interface ExportArtifact {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export type ExportRowValue = string | number | boolean | null | undefined;

export interface ExportRow {
  [key: string]: ExportRowValue;
}

function escapeCsv(value: ExportRowValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function prettifyHeader(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function buildCsvBuffer(rows: ExportRow[]): Promise<Buffer> {
  if (rows.length === 0) {
    return Buffer.from("No data available\n", "utf8");
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
  ];

  return Buffer.from(lines.join("\n"), "utf8");
}

async function buildExcelBuffer(sheetName: string, rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (rows.length === 0) {
    worksheet.addRow(["No data available"]);
  } else {
    const headers = Object.keys(rows[0]);
    worksheet.columns = headers.map((header) => ({
      header: prettifyHeader(header),
      key: header,
      width: Math.max(16, prettifyHeader(header).length + 4),
    }));

    rows.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
  }

  const content = await workbook.xlsx.writeBuffer();
  return Buffer.from(content);
}

async function buildPdfBuffer(title: string, rows: ExportRow[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fontSize(18).text(title, { align: "left" });
    document.moveDown();

    if (rows.length === 0) {
      document.fontSize(11).text("No data available");
      document.end();
      return;
    }

    rows.forEach((row, index) => {
      if (index > 0) {
        document.moveDown(0.5);
      }

      document.fontSize(12).text(`Row ${index + 1}`, { underline: true });
      Object.entries(row).forEach(([key, value]) => {
        document.fontSize(10).text(`${prettifyHeader(key)}: ${value ?? ""}`);
      });

      if (document.y > 720) {
        document.addPage();
      }
    });

    document.end();
  });
}

export async function buildExportArtifact(
  title: string,
  baseFileName: string,
  rows: ExportRow[],
  format: ExportFormat,
): Promise<ExportArtifact> {
  if (format === "csv") {
    return {
      buffer: await buildCsvBuffer(rows),
      mimeType: "text/csv; charset=utf-8",
      fileName: `${baseFileName}.csv`,
    };
  }

  if (format === "excel") {
    return {
      buffer: await buildExcelBuffer(title, rows),
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: `${baseFileName}.xlsx`,
    };
  }

  if (format === "cwr") {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const lines = [
      `HDR|${title.toUpperCase().replace(/\s+/g, "_")}`,
      ...rows.map((row) =>
        ["ROW", ...headers.map((header) => String(row[header] ?? ""))].join("|"),
      ),
      `TRL|${rows.length}`,
    ];

    return {
      buffer: Buffer.from(`${lines.join("\n")}\n`, "utf8"),
      mimeType: "text/plain; charset=utf-8",
      fileName: `${baseFileName}.cwr`,
    };
  }

  return {
    buffer: await buildPdfBuffer(title, rows),
    mimeType: "application/pdf",
    fileName: `${baseFileName}.pdf`,
  };
}
