"use client";

import { SimpleCrudPage } from "@/components/admin/SimpleCrudPage";

export default function AdminIncidentsPage() {
  return (
    <SimpleCrudPage
      resource="incidents"
      title="Incidents"
      description="Publish, edit, archive, and restore the global outage banners every staff member sees."
      columns={[
        { key: "title", label: "Title" },
        { key: "message", label: "Message", format: "truncate" },
        { key: "severity", label: "Severity" },
        { key: "is_active", label: "Status", format: "status" },
        { key: "updated_at", label: "Updated", format: "date" },
      ]}
      fields={[
        { key: "title", label: "Title", required: true },
        { key: "severity", label: "Severity", type: "select", required: true, defaultValue: "warning", options: [
          { label: "Information", value: "info" },
          { label: "Warning", value: "warning" },
          { label: "Critical", value: "critical" },
        ] },
        { key: "message", label: "Message", type: "textarea", required: true },
        { key: "is_active", label: "Publish immediately", type: "checkbox", defaultValue: true },
      ]}
      filters={[
        { key: "severity", label: "Severity", options: [
          { label: "Information", value: "info" },
          { label: "Warning", value: "warning" },
          { label: "Critical", value: "critical" },
        ] },
        { key: "is_active", label: "Status", options: [
          { label: "Active", value: "true" },
          { label: "Inactive", value: "false" },
        ] },
      ]}
    />
  );
}
