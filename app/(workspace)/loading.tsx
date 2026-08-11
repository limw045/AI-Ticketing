import { GTLoader } from "@/components/ui/GTLoader";

export default function WorkspaceLoading() {
  return <GTLoader delayed className="min-h-[50vh]" label="Loading workspace" />;
}
