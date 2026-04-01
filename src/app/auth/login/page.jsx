import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user && !user.isSuperAdmin) {
    redirect('/dashboard');
  }
  else if (user && user.isSuperAdmin) {
    redirect("/admin");
  }
  return <LoginClient />;
}

