import { requireAdminPage } from "@/lib/admin/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return children;
}
