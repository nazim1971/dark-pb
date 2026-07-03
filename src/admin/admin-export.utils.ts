import { ExportArtifact, ExportRow, buildExportArtifact } from "../reports/export.utils";

interface CwrWorkInput {
  workTitle: string;
  iswc?: string | null;
  isrc?: string | null;
  writers: Array<{ name: string; ipi?: string | null; share?: number | null }>;
  publishers: Array<{ name: string; ipi?: string | null; share?: number | null }>;
}

export async function buildAdminCsvExport(
  rows: ExportRow[],
  baseFileName: string,
): Promise<ExportArtifact> {
  return buildExportArtifact("Admin Activity", baseFileName, rows, "csv");
}

export function buildCwrArtifact(workRows: CwrWorkInput[], baseFileName: string): ExportArtifact {
  const lines: string[] = [];
  const generatedAt = new Date().toISOString();

  lines.push(`HDR|DARKPB|${generatedAt}`);

  workRows.forEach((work, index) => {
    lines.push(["WRK", index + 1, work.workTitle, work.iswc ?? "", work.isrc ?? ""].join("|"));

    work.writers.forEach((writer, writerIndex) => {
      lines.push(
        ["WRT", index + 1, writerIndex + 1, writer.name, writer.ipi ?? "", writer.share ?? ""].join(
          "|",
        ),
      );
    });

    work.publishers.forEach((publisher, publisherIndex) => {
      lines.push(
        [
          "PBL",
          index + 1,
          publisherIndex + 1,
          publisher.name,
          publisher.ipi ?? "",
          publisher.share ?? "",
        ].join("|"),
      );
    });
  });

  lines.push(`TRL|${workRows.length}`);

  return {
    buffer: Buffer.from(lines.join("\n"), "utf8"),
    mimeType: "text/plain; charset=utf-8",
    fileName: `${baseFileName}.cwr`,
  };
}
