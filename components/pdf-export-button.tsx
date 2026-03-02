"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Add type for autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

type Props = {
  title: string;
  filename: string;
  headers: string[];
  data: (string | number)[][];
  subtitle?: string;
  buttonLabel?: string;
  orientation?: "portrait" | "landscape";
  verticalHeader?: boolean;
  columnStyles?: Record<number, any>;
  margin?: { top: number; left: number; right: number; bottom: number };
  buttonClassName?: string;
  logoUrl?: string;
  showPrintFooter?: boolean;
};

export function PDFExportButton({
  title,
  filename,
  headers,
  data,
  subtitle,
  buttonLabel = "Export PDF",
  orientation = "portrait",
  verticalHeader = false,
  columnStyles = {},
  margin = { top: 20, left: 14, right: 14, bottom: 20 },
  buttonClassName,
  logoUrl = "/Logo_SMKNPasirian.png",
  showPrintFooter = true,
}: Props) {
  const exportPDF = async () => {
    const toDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Gagal membaca logo."));
        reader.readAsDataURL(blob);
      });

    let logoDataUrl = "";
    if (logoUrl) {
      try {
        const logoRes = await fetch(logoUrl, { cache: "no-store" });
        if (logoRes.ok) {
          const logoBlob = await logoRes.blob();
          logoDataUrl = await toDataUrl(logoBlob);
        }
      } catch {
        // ignore logo fetch errors, PDF generation continues without logo
      }
    }

    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4",
    });

    const { top, left, right, bottom } = margin;

    const hasLogo = Boolean(logoDataUrl);
    const logoWidth = 12;
    const logoHeight = 12;
    const titleX = hasLogo ? left + logoWidth + 3 : left;

    if (hasLogo) {
      doc.addImage(logoDataUrl, "PNG", left, top - 2, logoWidth, logoHeight);
    }

    // Set Title
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.text(title, titleX, top + 2);

    // Set Subtitle if exists
    let tableStartY = top + 10;
    if (subtitle) {
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(subtitle, titleX, top + 10);
      tableStartY = top + 15;
    }

    // Generate Table
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: tableStartY,
      margin: { top, left, right, bottom },
      theme: "grid",
      showHead: "everyPage",
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
      styles: {
        fontSize: 7.5,
        halign: "left",
        valign: "top",
        overflow: "linebreak",
        cellPadding: 1.6,
      },
      columnStyles: columnStyles,
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        minCellHeight: verticalHeader ? 35 : undefined,
        valign: "middle",
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      willDrawCell: (data) => {
        if (
          verticalHeader &&
          data.section === "head" &&
          data.column.index > 0
        ) {
          data.cell.text = [""]; // Hide default text
        }
      },
      didDrawCell: (data) => {
        if (
          verticalHeader &&
          data.section === "head" &&
          data.column.index > 0
        ) {
          const text = headers[data.column.index];
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);

          // Split text into two lines if it contains spaces and is long
          const words = text.split(" ");
          let line1 = text;
          let line2 = "";

          if (words.length > 2) {
            const mid = Math.ceil(words.length / 2);
            line1 = words.slice(0, mid).join(" ");
            line2 = words.slice(mid).join(" ");
          } else if (words.length === 2 && text.length > 10) {
            line1 = words[0];
            line2 = words[1];
          }

          if (line2) {
            // Two lines
            const x1 = data.cell.x + data.cell.width / 2 - 2;
            const x2 = data.cell.x + data.cell.width / 2 + 3;
            const y1 =
              data.cell.y + data.cell.height / 2 + doc.getTextWidth(line1) / 2;
            const y2 =
              data.cell.y + data.cell.height / 2 + doc.getTextWidth(line2) / 2;
            doc.text(line1, x1, y1, { angle: 90 });
            doc.text(line2, x2, y2, { angle: 90 });
          } else {
            // Single line
            const x = data.cell.x + data.cell.width / 2 + 2;
            const y =
              data.cell.y + data.cell.height / 2 + doc.getTextWidth(text) / 2;
            doc.text(text, x, y, { angle: 90 });
          }
        }
      },
      didDrawPage: (data) => {
        if (!showPrintFooter) return;
        const printedAt = new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date());
        const pageText = `Hal ${data.pageNumber}`;
        const footerText = `Dicetak: ${printedAt}`;
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(footerText, left, doc.internal.pageSize.getHeight() - 7);
        doc.text(
          pageText,
          doc.internal.pageSize.getWidth() - right,
          doc.internal.pageSize.getHeight() - 7,
          { align: "right" },
        );
      },
    });

    // Save PDF
    doc.save(filename);
  };

  return (
    <button
      type="button"
      onClick={exportPDF}
      className={
        buttonClassName ||
        "inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      }
    >
      <svg
        className="mr-1.5 h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      {buttonLabel}
    </button>
  );
}
