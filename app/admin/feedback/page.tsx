import { requireAdmin } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";

const CATEGORY_COLORS: Record<string, string> = {
  bug:         "bg-[#fde0e0] text-[#7a1a1a]",
  feature:     "bg-[#fef3cd] text-[#7a5800]",
  testimonial: "bg-[#d1ead1] text-[#2d6b2d]",
  general:     "bg-[#e5e0d8] text-[#4b443e]",
};

async function setStatus(id: string, status: string) {
  "use server";
  const prisma = getPrisma();
  try {
    await prisma.feedback.update({ where: { id }, data: { status } });
  } finally {
    await prisma.$disconnect();
  }
  revalidatePath("/admin/feedback");
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  await requireAdmin();
  const { status = "new", category } = await searchParams;

  const prisma = getPrisma();
  try {
    const [items, counts] = await Promise.all([
      prisma.feedback.findMany({
        where: {
          ...(status !== "all" ? { status } : {}),
          ...(category ? { category } : {}),
        },
        orderBy: { created_at: "desc" },
        include: {
          user: { select: { id: true, email: true } },
        },
      }),
      prisma.feedback.groupBy({ by: ["status"], _count: { id: true } }),
    ]);

    const countMap: Record<string, number> = {};
    for (const c of counts) countMap[c.status] = c._count.id;
    const total = Object.values(countMap).reduce((a, b) => a + b, 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#3c3732]">Feedback</h1>
          <p className="mt-0.5 text-sm text-[#7d7570]">{total} messages total</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { val: "new",      label: `New (${countMap["new"] ?? 0})` },
            { val: "reviewed", label: `Reviewed (${countMap["reviewed"] ?? 0})` },
            { val: "archived", label: `Archived (${countMap["archived"] ?? 0})` },
            { val: "all",      label: `All (${total})` },
          ].map((tab) => (
            <Link
              key={tab.val}
              href={`/admin/feedback?status=${tab.val}${category ? `&category=${category}` : ""}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                status === tab.val
                  ? "bg-[#4b443e] text-white"
                  : "border border-[#ddd6cb] bg-white text-[#5a524c] hover:bg-[#f1ece4]"
              }`}
            >
              {tab.label}
            </Link>
          ))}

          <div className="mx-2 w-px self-stretch bg-[#e5dfd4]" />

          {["all", "general", "bug", "feature", "testimonial"].map((cat) => (
            <Link
              key={cat}
              href={`/admin/feedback?status=${status}${cat !== "all" ? `&category=${cat}` : ""}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                (category ?? "all") === cat
                  ? "bg-[#9a9089] text-white"
                  : "border border-[#ddd6cb] bg-white text-[#5a524c] hover:bg-[#f1ece4]"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* List */}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-[#ddd6cb] bg-white px-6 py-12 text-center">
            <p className="text-sm text-[#9a9089]">No messages here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white p-5 transition ${
                  item.status === "new" ? "border-[#ddd6cb]" : "border-[#ede8e1] opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        CATEGORY_COLORS[item.category] ?? "bg-[#e5e0d8] text-[#4b443e]"
                      }`}
                    >
                      {item.category}
                    </span>
                    <Link
                      href={`/admin/landlords/${item.user.id}`}
                      className="text-xs font-medium text-[#4b443e] hover:underline"
                    >
                      {item.user.email}
                    </Link>
                    <span className="text-[10px] text-[#9a9089]">
                      {item.created_at.toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    {item.status !== "reviewed" && (
                      <form action={setStatus.bind(null, item.id, "reviewed")}>
                        <button
                          type="submit"
                          className="rounded-lg border border-[#d1ead1] bg-[#f0faf0] px-2.5 py-1 text-[11px] font-medium text-[#2d6b2d] hover:bg-[#d1ead1] transition"
                        >
                          ✓ Mark reviewed
                        </button>
                      </form>
                    )}
                    {item.status !== "archived" && (
                      <form action={setStatus.bind(null, item.id, "archived")}>
                        <button
                          type="submit"
                          className="rounded-lg border border-[#e5e0d8] bg-[#faf7f2] px-2.5 py-1 text-[11px] font-medium text-[#9a9089] hover:bg-[#e5e0d8] transition"
                        >
                          Archive
                        </button>
                      </form>
                    )}
                    {item.status === "archived" && (
                      <form action={setStatus.bind(null, item.id, "new")}>
                        <button
                          type="submit"
                          className="rounded-lg border border-[#e5e0d8] bg-[#faf7f2] px-2.5 py-1 text-[11px] font-medium text-[#9a9089] hover:bg-[#e5e0d8] transition"
                        >
                          Restore
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#4a443e] whitespace-pre-wrap">
                  {item.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } finally {
    await prisma.$disconnect();
  }
}
