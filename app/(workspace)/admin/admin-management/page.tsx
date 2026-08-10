import { StaffManagement } from "@/components/admin/StaffManagement";
import { requireAdminPage } from "@/lib/admin/server";

export default async function AdminManagementPage() {
  await requireAdminPage(true);
  return <StaffManagement administratorsOnly />;
}
