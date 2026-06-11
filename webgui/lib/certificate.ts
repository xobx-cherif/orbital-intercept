// Client-side PDF certificate generator. Uses jsPDF (dynamically imported by
// the caller). Draws a styled completion certificate with the operator's name,
// the UAE national flag (vector — crisp at any zoom, no image asset needed),
// a "Proud of you!" message, and the solve score over the assigned scenarios.
//
// NOTE: deliberately does NOT print secret CTF flags — a downloadable file is
// not a safe place for answer keys (per the per-user-flag design).

import type jsPDF from "jspdf";

export type CertData = {
  name: string; // the name the operator typed
  operator: string; // their login (e.g. operator07)
  solved: number;
  total: number;
  scenarios: { codename: string; kind: string; status: string }[];
};

// --- palette ---------------------------------------------------------------
const INK = "#0a1018";
const PANEL = "#0e1622";
const CYAN = "#58e7ff";
const ICE = "#cdeffb";
const DIM = "#8aa6bd";
const GOLD = "#ffcf6b";
const GREEN = "#009639"; // UAE flag green
const WHITE = "#ffffff";
const BLACK = "#000000";
const RED = "#ce1126"; // UAE flag red

// Draw the UAE national flag at (x,y) with given width/height.
// Layout: red vertical bar on the hoist, then three horizontal bands
// green / white / black.
function drawUaeFlag(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const red = w * 0.25; // hoist red bar is 1/4 of the width
  const bandH = h / 3;
  const fieldX = x + red;
  const fieldW = w - red;

  doc.setFillColor(RED);
  doc.rect(x, y, red, h, "F");
  doc.setFillColor(GREEN);
  doc.rect(fieldX, y, fieldW, bandH, "F");
  doc.setFillColor(WHITE);
  doc.rect(fieldX, y + bandH, fieldW, bandH, "F");
  doc.setFillColor(BLACK);
  doc.rect(fieldX, y + 2 * bandH, fieldW, bandH, "F");

  // thin outline so the white band reads on a light area
  doc.setDrawColor(DIM);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h, "S");
}

export function buildCertificate(JsPDF: typeof jsPDF, data: CertData): jsPDF {
  const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  // ---- background ----
  doc.setFillColor(INK);
  doc.rect(0, 0, W, H, "F");

  // subtle inner panel
  doc.setFillColor(PANEL);
  doc.roundedRect(10, 10, W - 20, H - 20, 3, 3, "F");

  // ---- decorative double border ----
  doc.setDrawColor(CYAN);
  doc.setLineWidth(1.1);
  doc.roundedRect(13, 13, W - 26, H - 26, 2, 2, "S");
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(16, 16, W - 32, H - 32, 2, 2, "S");

  // corner ticks (HUD vibe)
  const tick = 7;
  doc.setDrawColor(CYAN);
  doc.setLineWidth(0.9);
  const corners: [number, number, number, number][] = [
    [20, 20, 1, 1],
    [W - 20, 20, -1, 1],
    [20, H - 20, 1, -1],
    [W - 20, H - 20, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    doc.line(cx, cy, cx + tick * sx, cy);
    doc.line(cx, cy, cx, cy + tick * sy);
  }

  // ---- header ----
  doc.setFont("helvetica", "bold");
  doc.setTextColor(CYAN);
  doc.setFontSize(11);
  doc.text("O R B I T A L   I N T E R C E P T", W / 2, 34, { align: "center" });

  doc.setTextColor(DIM);
  doc.setFontSize(8.5);
  doc.text(
    "SATELLITE IMAGERY TASKING RANGE  ·  GULF THEATRE (TRAINING)",
    W / 2,
    40,
    { align: "center" },
  );

  // ---- UAE flag, centered under header ----
  const fw = 46;
  const fh = fw * 0.5; // 2:1 ratio
  drawUaeFlag(doc, W / 2 - fw / 2, 47, fw, fh);

  // ---- title ----
  doc.setFont("helvetica", "bold");
  doc.setTextColor(ICE);
  doc.setFontSize(30);
  doc.text("CERTIFICATE OF COMPLETION", W / 2, 92, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(DIM);
  doc.setFontSize(11);
  doc.text("This certifies that", W / 2, 103, { align: "center" });

  // ---- operator name ----
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GOLD);
  doc.setFontSize(34);
  doc.text(data.name, W / 2, 119, { align: "center" });

  // underline flourish under the name (width ~ name length)
  const nameW = Math.min(180, Math.max(70, doc.getTextWidth(data.name) + 16));
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - nameW / 2, 124, W / 2 + nameW / 2, 124);

  // ---- citation ----
  doc.setFont("helvetica", "normal");
  doc.setTextColor(ICE);
  doc.setFontSize(11);
  doc.text(
    `completed the Orbital Intercept tasking mission as ${data.operator.toUpperCase()},`,
    W / 2,
    134,
    { align: "center" },
  );

  // ---- score ----
  doc.setFont("helvetica", "bold");
  doc.setTextColor(CYAN);
  doc.setFontSize(15);
  doc.text(
    `solving ${data.solved} of ${data.total} assigned scenarios.`,
    W / 2,
    144,
    { align: "center" },
  );

  // ---- "Proud of you!" ----
  doc.setFont("helvetica", "bolditalic");
  doc.setTextColor(GREEN);
  doc.setFontSize(22);
  doc.text("Proud of you!", W / 2, 160, { align: "center" });

  // ---- scenario list (small, two-column-ish single line each, centered) ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let ly = 172;
  for (const s of data.scenarios) {
    const mark =
      s.status === "solved" ? "[SOLVED]" : s.status === "skipped" ? "[SKIPPED]" : "[LOCKED]";
    doc.setTextColor(s.status === "solved" ? "#57f2a4" : DIM);
    doc.text(`${mark}  ${s.codename}  ·  ${s.kind.replace("_", " ")}`, W / 2, ly, {
      align: "center",
    });
    ly += 5;
  }

  // ---- footer line ----
  doc.setDrawColor(CYAN);
  doc.setLineWidth(0.3);
  doc.line(40, H - 22, W - 40, H - 22);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(DIM);
  doc.setFontSize(7.5);
  doc.text(
    "ORBITAL INTERCEPT · CTF RANGE · fictional training scenario — issued on completion",
    W / 2,
    H - 17,
    { align: "center" },
  );

  return doc;
}
