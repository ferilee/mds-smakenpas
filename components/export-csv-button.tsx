"use client";

import { Download } from "lucide-react";

type ExportCSVButtonProps = {
    data: any[];
    filename: string;
    label: string;
};

export function ExportCSVButton({ data, filename, label }: ExportCSVButtonProps) {
    const exportToCSV = () => {
        if (!data.length) return;

        // Extract headers
        const headers = Object.keys(data[0]);

        // Create CSV rows
        const csvRows = [
            headers.join(","), // header row
            ...data.map(row =>
                headers.map(header => {
                    const val = row[header];
                    // Handle values with commas or quotes
                    const stringVal = val === null || val === undefined ? "" : String(val);
                    if (stringVal.includes(",") || stringVal.includes("\"") || stringVal.includes("\n")) {
                        return `"${stringVal.replace(/"/g, '""')}"`;
                    }
                    return stringVal;
                }).join(",")
            )
        ];

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button
            onClick={exportToCSV}
            disabled={!data.length}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Download className="h-4 w-4" />
            {label}
        </button>
    );
}
