import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";

const ROOT_DIR = process.cwd();

const guides = [
  {
    markdownPath: path.join(ROOT_DIR, "docs", "panduan-siswa.md"),
    pdfPath: path.join(ROOT_DIR, "docs", "panduan-siswa.pdf"),
  },
  {
    markdownPath: path.join(ROOT_DIR, "docs", "panduan-guru.md"),
    pdfPath: path.join(ROOT_DIR, "docs", "panduan-guru.pdf"),
  },
];

function createWriter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 16;
  const marginRight = 16;
  const marginTop = 18;
  const marginBottom = 18;
  const maxWidth = pageWidth - marginLeft - marginRight;
  const maxY = pageHeight - marginBottom;
  let y = marginTop;

  function ensureSpace(heightNeeded = 6) {
    if (y + heightNeeded <= maxY) return;
    doc.addPage();
    y = marginTop;
  }

  function drawWrapped(text, options = {}) {
    const {
      fontSize = 11,
      style = "normal",
      indent = 0,
      spacing = 1.3,
      after = 1.5,
    } = options;

    const cleaned = String(text || "").trim();
    if (!cleaned) {
      y += after;
      return;
    }

    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);

    const width = Math.max(20, maxWidth - indent);
    const lines = doc.splitTextToSize(cleaned, width);
    const lineHeight = fontSize * 0.38 * spacing;
    ensureSpace(lines.length * lineHeight + after);
    doc.text(lines, marginLeft + indent, y);
    y += lines.length * lineHeight + after;
  }

  function addGap(height = 2.5) {
    ensureSpace(height);
    y += height;
  }

  return { drawWrapped, addGap };
}

function renderMarkdownToPdf(markdownPath, pdfPath) {
  const markdown = fs.readFileSync(markdownPath, "utf8");
  const lines = markdown.split(/\r?\n/);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const writer = createWriter(doc);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      writer.addGap(2);
      continue;
    }

    if (line.startsWith("# ")) {
      writer.drawWrapped(line.replace(/^#\s+/, ""), {
        fontSize: 18,
        style: "bold",
        spacing: 1.25,
        after: 3,
      });
      continue;
    }

    if (line.startsWith("## ")) {
      writer.drawWrapped(line.replace(/^##\s+/, ""), {
        fontSize: 14,
        style: "bold",
        spacing: 1.2,
        after: 2.5,
      });
      continue;
    }

    if (line.startsWith("### ")) {
      writer.drawWrapped(line.replace(/^###\s+/, ""), {
        fontSize: 12,
        style: "bold",
        spacing: 1.2,
        after: 2,
      });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      writer.drawWrapped(line, {
        fontSize: 11,
        style: "normal",
        indent: 3,
        spacing: 1.25,
        after: 1.2,
      });
      continue;
    }

    if (/^-\s+/.test(line)) {
      const text = `- ${line.replace(/^-+\s+/, "")}`;
      writer.drawWrapped(text, {
        fontSize: 11,
        style: "normal",
        indent: 3,
        spacing: 1.25,
        after: 1.2,
      });
      continue;
    }

    writer.drawWrapped(line, {
      fontSize: 11,
      style: "normal",
      spacing: 1.25,
      after: 1.2,
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(`Halaman ${page} / ${pageCount}`, pageWidth - 16, pageHeight - 8, {
      align: "right",
    });
  }

  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  doc.save(pdfPath);
  return pdfPath;
}

for (const guide of guides) {
  if (!fs.existsSync(guide.markdownPath)) {
    throw new Error(`File tidak ditemukan: ${guide.markdownPath}`);
  }
  const outputPath = renderMarkdownToPdf(guide.markdownPath, guide.pdfPath);
  console.log(`Generated: ${path.relative(ROOT_DIR, outputPath)}`);
}
