"use server";

import { mutateAdminResource } from "@/lib/admin/server";
import type { AdminMutationInput } from "@/lib/admin/types";

export async function runAdminMutation(input: AdminMutationInput) {
  return mutateAdminResource(input);
}
