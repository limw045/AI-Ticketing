import jsPDF from "jspdf";
import { priorityLabel, ticketStatusLabel } from "@/lib/display-labels";
import { formatDateTime } from "@/lib/date-display";

const PURPLE: [number, number, number] = [79, 45, 127];
const INK: [number, number, number] = [24, 20, 29];
const MUTED: [number, number, number] = [98, 92, 104];
const LINE: [number, number, number] = [229, 225, 232];

export async function exportTicketPDF(ticket: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const ticketNumber = String(ticket.ticket_number || "1001");

  try {
    const response = await fetch("/brand/ticketing-apple-icon.png");
    if (response.ok) {
      doc.addImage(new Uint8Array(await response.arrayBuffer()), "PNG", 14, 6, 24, 24);
    }
  } catch {
    // A temporarily unavailable brand asset must not prevent ticket export.
  }

  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(1.2);
  doc.line(margin, 33, pageWidth - margin, 33);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PURPLE);
  doc.text("Grant Thornton AI Department", 43, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("SUPPORT DESK", 43, 25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(`Ticket #${ticketNumber}`, margin, 49);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const titleLines = doc.splitTextToSize(String(ticket.title || "Untitled request"), contentWidth);
  doc.text(titleLines, margin, 57);
  let y = 57 + titleLines.length * 5 + 8;

  const details = [
    ["Status", ticketStatusLabel(ticket.status || "open")],
    ["Priority", priorityLabel(ticket.priority || "medium")],
    ["Category", ticket.category || "General"],
    ["Author", ticket.author?.display_name || "Staff Member"],
    ["Email", ticket.author?.email || ""],
    ["Created", formatDateTime(ticket.created_at || new Date())],
  ];

  for (const [label, value] of details) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const valueLines = doc.splitTextToSize(String(value), contentWidth - 38);
    doc.text(valueLines, margin + 38, y);
    y += Math.max(9, valueLines.length * 5 + 3);
  }

  y += 3;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("Issue description", margin, y);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const descriptionLines: string[] = doc.splitTextToSize(
    String(ticket.description || "No description provided"),
    contentWidth,
  );
  for (const line of descriptionLines) {
    if (y > pageHeight - 22) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 5.5;
  }

  doc.save(`Ticket-#${ticketNumber}.pdf`);
}
