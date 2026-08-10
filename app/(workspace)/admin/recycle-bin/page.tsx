import { RecycleBinClient } from "@/components/admin/RecycleBinClient";
import { requireAdminPage } from "@/lib/admin/server";

export default async function RecycleBinPage() {
  await requireAdminPage(true);
  return <RecycleBinClient />;
}
