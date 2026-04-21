import { redirect } from "next/navigation";

export default function AuditLogPage() {
  redirect("/settings?tab=audit");
}
