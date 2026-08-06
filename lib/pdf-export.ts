import jsPDF from "jspdf";

export function exportTicketPDF(ticket: any) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`GTMSW Support Ticket Report: #${ticket.ticket_number || "1001"}`, 20, 20);
  doc.setFontSize(12);
  doc.text(`Title: ${ticket.title || "N/A"}`, 20, 35);
  doc.text(`Category: ${ticket.category || "General"}`, 20, 45);
  doc.text(`Status: ${ticket.status || "open"}`, 20, 55);
  doc.text(`Priority: ${ticket.priority || "medium"}`, 20, 65);
  doc.text(`Author: ${ticket.author?.display_name || "Staff Member"} (${ticket.author?.email || ""})`, 20, 75);
  doc.text(`Created At: ${new Date(ticket.created_at || Date.now()).toLocaleString()}`, 20, 85);
  
  doc.setFontSize(10);
  doc.text("Issue Description:", 20, 100);
  const lines = doc.splitTextToSize(ticket.description || "No description provided", 170);
  doc.text(lines, 20, 110);
  
  doc.save(`Ticket-#${ticket.ticket_number || "1001"}.pdf`);
}
