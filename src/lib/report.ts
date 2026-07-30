import type { Lang } from "@/lib/i18n";
import { downloadText } from "@/lib/csv";

export interface ReportSpec {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  headers: string[];
  rows: string[][];
  /** Column indexes rendered right-aligned / tabular. */
  numeric?: number[];
  lang: Lang;
  filename: string;
}

const FONT_AR = "'IBM Plex Sans Arabic','Tajawal',system-ui,sans-serif";
const FONT_EN = "Inter,system-ui,sans-serif";

/**
 * Renders the report as real DOM (so the browser handles Arabic shaping and RTL),
 * then rasterizes it. jsPDF's built-in fonts cannot shape Arabic — this avoids that entirely.
 */
function buildNode(spec: ReportSpec) {
  const rtl = spec.lang === "ar";
  const el = document.createElement("div");
  el.setAttribute("dir", rtl ? "rtl" : "ltr");
  el.style.cssText = `position:fixed;top:0;${rtl ? "right" : "left"}:-10000px;width:1000px;padding:40px;background:#ffffff;color:#14161a;font-family:${
    rtl ? FONT_AR : FONT_EN
  };font-size:14px;line-height:1.5;`;

  const num = new Set(spec.numeric ?? []);
  const align = rtl ? "right" : "left";
  const alignEnd = rtl ? "left" : "right";

  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:1px solid #e4e6ea;padding-bottom:16px;">
      <div>
        <div style="font-size:22px;font-weight:600;letter-spacing:normal;">${esc(spec.title)}</div>
        ${spec.subtitle ? `<div style="margin-top:4px;font-size:13px;color:#6b7280;">${esc(spec.subtitle)}</div>` : ""}
      </div>
      <div style="font-size:12px;color:#6b7280;">${new Date().toISOString().slice(0, 10)}</div>
    </div>
    ${
      spec.meta?.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:28px;padding:16px 0;border-bottom:1px solid #e4e6ea;">${spec.meta
            .map(
              (m) =>
                `<div><div style="font-size:11px;letter-spacing:normal;color:#8b919b;">${esc(
                  m.label,
                )}</div><div style="margin-top:2px;font-size:16px;font-weight:600;">${esc(m.value)}</div></div>`,
            )
            .join("")}</div>`
        : ""
    }
    <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:13px;">
      <thead>
        <tr>${spec.headers
          .map(
            (h, i) =>
              `<th style="text-align:${num.has(i) ? alignEnd : align};padding:8px 10px;background:#f6f7f9;border:1px solid #e4e6ea;font-weight:600;font-size:12px;color:#4b5563;">${esc(
                h,
              )}</th>`,
          )
          .join("")}</tr>
      </thead>
      <tbody>
        ${spec.rows
          .map(
            (r) =>
              `<tr>${r
                .map(
                  (c, i) =>
                    `<td style="text-align:${num.has(i) ? alignEnd : align};padding:7px 10px;border:1px solid #eceef1;font-variant-numeric:tabular-nums;">${esc(
                      c,
                    )}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
    ${spec.rows.length === 0 ? `<div style="padding:40px;text-align:center;color:#9ca3af;font-size:13px;">—</div>` : ""}
  `;
  document.body.appendChild(el);
  return el;
}

function esc(s: string) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

async function rasterize(spec: ReportSpec) {
  const node = buildNode(spec);
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    const html2canvas = (await import("html2canvas-pro")).default;
    return await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", logging: false });
  } finally {
    node.remove();
  }
}

export async function exportReportPdf(spec: ReportSpec) {
  const canvas = await rasterize(spec);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 24;
  const w = pw - margin * 2;
  const h = (canvas.height * w) / canvas.width;
  const img = canvas.toDataURL("image/png");

  if (h <= ph - margin * 2) {
    doc.addImage(img, "PNG", margin, margin, w, h);
  } else {
    // Slice the tall render into page-sized chunks.
    const pageH = ph - margin * 2;
    const sliceH = (pageH * canvas.width) / w;
    let y = 0;
    let first = true;
    while (y < canvas.height) {
      const part = document.createElement("canvas");
      part.width = canvas.width;
      part.height = Math.min(sliceH, canvas.height - y);
      const ctx = part.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, part.width, part.height);
      ctx.drawImage(canvas, 0, y, part.width, part.height, 0, 0, part.width, part.height);
      if (!first) doc.addPage();
      doc.addImage(
        part.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        w,
        (part.height * w) / part.width,
      );
      first = false;
      y += part.height;
    }
  }
  doc.save(`${spec.filename}.pdf`);
}

export async function exportReportImage(spec: ReportSpec) {
  const canvas = await rasterize(spec);
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${spec.filename}.png`;
  a.click();
}

export function exportReportCsv(spec: ReportSpec) {
  const lines = [spec.headers, ...spec.rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadText(`${spec.filename}.csv`, lines);
}

export async function exportReportExcel(spec: ReportSpec) {
  const XLSX = await import("xlsx");
  const data = [
    [spec.title],
    spec.subtitle ? [spec.subtitle] : [],
    spec.headers,
    ...spec.rows,
  ].filter((r) => r.length);
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = spec.headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${spec.filename}.xlsx`);
}
