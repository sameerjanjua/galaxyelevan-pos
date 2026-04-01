import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReportsLayout({ children }) {
  const user = await requireUser();
  if (user.role === "STAFF") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
