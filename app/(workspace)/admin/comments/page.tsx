"use client";

import { SimpleCrudPage } from "@/components/admin/SimpleCrudPage";

export default function AdminCommentsPage() {
  return (
    <SimpleCrudPage
      resource="comments"
      title="Conversations"
      itemName="reply or note"
      listName="replies and notes"
      description="Review public replies and internal notes across tickets."
      emptyDescription="Replies and internal notes will appear here as requests are discussed."
      columns={[
        { key: "ticket.ticket_number", label: "Ticket" },
        { key: "author.display_name", label: "Author" },
        { key: "content", label: "Content", format: "truncate" },
        { key: "is_internal_note", label: "Visibility", format: "visibility" },
        { key: "type", label: "Type" },
        { key: "created_at", label: "Created", format: "date" },
      ]}
      fields={[
        { key: "ticket_id", label: "Ticket ID", required: true, placeholder: "Ticket UUID" },
        { key: "is_internal_note", label: "Internal note", type: "checkbox", defaultValue: false },
        { key: "content", label: "Comment", type: "textarea", required: true, placeholder: "Write the reply or internal note..." },
      ]}
      filters={[
        {
          key: "is_internal_note",
          label: "Visibility",
          options: [
            { label: "Public", value: "false" },
            { label: "Internal", value: "true" },
          ],
        },
      ]}
      isReadOnlyRow={(row) => row.type === "system_audit"}
    />
  );
}
