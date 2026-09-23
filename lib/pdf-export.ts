import jsPDF from "jspdf";
import { priorityLabel, ticketStatusLabel } from "@/lib/display-labels";

export async function exportTicketPDF(ticket: any) {
  const doc = new jsPDF();
  try {
    const response = await fetch("/brand/ticketing-apple-icon.png");
    if (response.ok) {
      doc.addImage(new Uint8Array(await response.arrayBuffer()), "PNG", 14, 4, 27, 27);
    }
  } catch {
    // A temporarily unavailable brand asset must not prevent ticket export.
  }
  doc.setFontSize(13);
  doc.text(`Grant Thornton AI Department · Ticket Report: #${ticket.ticket_number || "1001"}`, 43, 20);
  doc.setFontSize(12);
  doc.text(`Title: ${ticket.title || "N/A"}`, 20, 35);
  doc.text(`Category: ${ticket.category || "General"}`, 20, 45);
  doc.text(`Status: ${ticketStatusLabel(ticket.status || "open")}`, 20, 55);
  doc.text(`Priority: ${priorityLabel(ticket.priority || "medium")}`, 20, 65);
  doc.text(`Author: ${ticket.author?.display_name || "Staff Member"} (${ticket.author?.email || ""})`, 20, 75);
  doc.text(`Created At: ${new Date(ticket.created_at || Date.now()).toLocaleString()}`, 20, 85);
  
  doc.setFontSize(10);
  doc.text("Issue Description:", 20, 100);
  const lines = doc.splitTextToSize(ticket.description || "No description provided", 170);
  doc.text(lines, 20, 110);
  
  doc.save(`Ticket-#${ticket.ticket_number || "1001"}.pdf`);
}
