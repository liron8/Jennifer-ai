import { redirect } from "next/navigation";

export default function TeamSettingsPage() {
  redirect("/settings?tab=team");
}
