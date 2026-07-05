import { Prisma } from "@prisma/client";
import { ExportArtifact } from "../reports/export.utils";

interface CwrRoyaltyEntry {
  royaltyId: string;
  songTitle: string;
  writerName: string;
  territory: string;
  sourceDsp: string;
  periodYear: number;
  periodMonth: number;
  grossAmount: Prisma.Decimal;
  allocatedAmount: Prisma.Decimal;
  currency: string;
}

function decimalToFixed(value: Prisma.Decimal, digits = 4): string {
  return Number(value).toFixed(digits);
}

export function buildStatementCwrArtifact(input: {
  statementNo: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  royalties: CwrRoyaltyEntry[];
}): ExportArtifact {
  const lines: string[] = [];
  lines.push(`HDR|${input.statementNo}|${input.generatedAt.toISOString()}`);
  lines.push(
    `PRD|${input.periodStart.toISOString().slice(0, 10)}|${input.periodEnd
      .toISOString()
      .slice(0, 10)}`,
  );

  for (const entry of input.royalties) {
    lines.push(
      [
        "SWR",
        entry.royaltyId,
        entry.songTitle,
        entry.writerName,
        entry.territory,
        entry.sourceDsp,
        String(entry.periodYear),
        String(entry.periodMonth).padStart(2, "0"),
        decimalToFixed(entry.grossAmount),
        decimalToFixed(entry.allocatedAmount),
        entry.currency,
      ].join("|"),
    );
  }

  lines.push(`TRL|${input.royalties.length}`);

  return {
    buffer: Buffer.from(`${lines.join("\n")}\n`, "utf8"),
    mimeType: "text/plain; charset=utf-8",
    fileName: `statement-${input.statementNo.toLowerCase()}.cwr`,
  };
}
