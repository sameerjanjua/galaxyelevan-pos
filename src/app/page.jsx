import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    if (user.isSuperAdmin) {
      redirect("/admin");
    }
    redirect(`/${user.tenantSlug}/dashboard`);
  }

  redirect("/auth/login");
}

