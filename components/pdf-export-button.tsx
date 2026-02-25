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
}: Props) {
    const exportPDF = () => {
        const doc = new jsPDF({
            orientation: orientation,
            unit: "mm",
            format: "a4",
        });

        const { top, left, right, bottom } = margin;

        // Set Title
        doc.setFontSize(18);
        doc.text(title, left, top);

        // Set Subtitle if exists
        let tableStartY = top + 6;
        if (subtitle) {
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(subtitle, left, top + 8);
            tableStartY = top + 13;
        }

        // Generate Table
        autoTable(doc, {
            head: [headers],
            body: data,
            startY: tableStartY,
            margin: { top, left, right, bottom },
            theme: "grid",
            styles: {
                fontSize: 9,
                halign: "center",
                valign: "middle"
            },
            columnStyles: columnStyles,
            headStyles: {
                fillColor: [79, 70, 229],
                minCellHeight: verticalHeader ? 35 : undefined,
                valign: 'middle',
                halign: 'center'
            },
            willDrawCell: (data) => {
                if (verticalHeader && data.section === 'head' && data.column.index > 0) {
                    data.cell.text = [""]; // Hide default text
                }
            },
            didDrawCell: (data) => {
                if (verticalHeader && data.section === 'head' && data.column.index > 0) {
                    const text = headers[data.column.index];
                    doc.setFontSize(8);
                    doc.setTextColor(255, 255, 255);

                    // Split text into two lines if it contains spaces and is long
                    const words = text.split(' ');
                    let line1 = text;
                    let line2 = "";

                    if (words.length > 2) {
                        const mid = Math.ceil(words.length / 2);
                        line1 = words.slice(0, mid).join(' ');
                        line2 = words.slice(mid).join(' ');
                    } else if (words.length === 2 && text.length > 10) {
                        line1 = words[0];
                        line2 = words[1];
                    }

                    if (line2) {
                        // Two lines
                        const x1 = data.cell.x + data.cell.width / 2 - 2;
                        const x2 = data.cell.x + data.cell.width / 2 + 3;
                        const y1 = data.cell.y + data.cell.height / 2 + doc.getTextWidth(line1) / 2;
                        const y2 = data.cell.y + data.cell.height / 2 + doc.getTextWidth(line2) / 2;
                        doc.text(line1, x1, y1, { angle: 90 });
                        doc.text(line2, x2, y2, { angle: 90 });
                    } else {
                        // Single line
                        const x = data.cell.x + data.cell.width / 2 + 2;
                        const y = data.cell.y + data.cell.height / 2 + doc.getTextWidth(text) / 2;
                        doc.text(text, x, y, { angle: 90 });
                    }
                }
            },
        });

        // Save PDF
        doc.save(filename);
    };

    return (
        <button
            type="button"
            onClick={exportPDF}
            className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
