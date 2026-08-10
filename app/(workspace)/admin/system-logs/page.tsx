import { SystemLogsClient } from "@/components/admin/SystemLogsClient";
import { requireAdminPage } from "@/lib/admin/server";

export default async function SystemLogsPage() {
  await requireAdminPage(true);
  return <SystemLogsClient />;
}
