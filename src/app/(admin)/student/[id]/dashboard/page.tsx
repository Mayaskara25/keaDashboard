import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import DashboardPage from "@/app/(student)/dashboard/page";

export default async function TeacherStudentView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role === "STUDENT") redirect("/login");

  const { id } = await params;

  const student = await prisma.user.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!student) notFound();

  return (
    <div>
      {/* Teacher banner */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[var(--border)]">
        <Link
          href="/admin/class"
          className="flex items-center gap-1 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ChevronLeft size={14} /> Back to Class Analytics
        </Link>
        <span className="text-[13px] text-[var(--text-muted)]">
          Viewing: <span className="font-semibold text-[var(--text)]">{student.name}</span>
        </span>
      </div>

      {/* Same dashboard, read-only */}
      <DashboardPage studentId={id} readOnly={true} />
    </div>
  );
}
