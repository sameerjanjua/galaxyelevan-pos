import { prisma } from "@/lib/prisma";
import { requireUser, ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppLayout from "@/components/layouts/app-layout/AppLayout";

export default async function AdminLayout({ children }) {

    const user = await requireUser();
    if (!user) {
        return redirect("/auth/login");
    }
    else if (user && user.isSuperAdmin) {
        return redirect(`/admin`);
    }

    const initialLocations =
        user.role === ROLES.OWNER || user.role === ROLES.MANAGER
            ? await prisma.location.findMany({
                where: { tenantId: user.tenantId },
                select: {
                    id: true,
                    name: true,
                    city: true,
                    country: true,
                },
                orderBy: { createdAt: "desc" },
            })
            : [];

    return (
        <AppLayout initialUser={user} initialLocations={initialLocations}>
            {children}
        </AppLayout>
    )
}
