import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppLayout } from "../components/AppLayout";

export default async function AdminLayout({ children }) {

    const user = await requireUser();
    if (!user) {
        return redirect("/auth/login");
    }
    else if (user && user.isSuperAdmin) {
        return redirect(`/admin`);
    }
    return (
        <AppLayout>
            {children}
        </AppLayout>
    )
}
