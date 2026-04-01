import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function createCustomer(formData) {
  "use server";

  const user = await requireUser();
  const name = formData.get("name");
  const phone = formData.get("phone");
  const email = formData.get("email");

  if (typeof name !== "string" || name.trim().length === 0) {
    return;
  }

  const newCustomer = await prisma.customer.create({
    data: {
      name: name.trim(),
      phone: typeof phone === "string" && phone.trim().length > 0 ? phone : null,
      email: typeof email === "string" && email.trim().length > 0 ? email : null,
      tenantId: user.tenantId,
    },
  });

  // Note: Socket.io events cannot be emitted directly from server actions
  // They will be handled through the customer creation page refresh
}

export default async function CustomersPage() {
  const user = await requireUser();
  const customers = await prisma.customer.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Customers</h1>
            <p className="text-xs text-slate-400">
              Keep simple profiles for regular guests and clients.
            </p>
          </div>
          <a
            href="/dashboard"
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-900"
          >
            Back to dashboard
          </a>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              Customer list
            </h2>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      Phone
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950">
                  {customers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        No customers yet. Add regular guests for quick lookup at
                        the POS.
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-3 py-2 text-slate-100">
                          {customer.name}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {customer.phone ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {customer.email ?? "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              Add customer
            </h2>
            <form action={createCustomer} className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Name
                </label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="Walk-in customer, John Doe..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Phone (optional)
                  </label>
                  <input
                    name="phone"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    placeholder="+92..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Email (optional)
                  </label>
                  <input
                    name="email"
                    type="email"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-400"
              >
                Save customer
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

