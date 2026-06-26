import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getRecommendedResources } from "@/lib/recommendation";
import { Badge } from "@/components/ui/badge";
import { FileText, Video, BookOpen, Link as LinkIcon, ExternalLink } from "lucide-react";

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  NOTES: <FileText size={14} />,
  VIDEO: <Video size={14} />,
  PDF: <FileText size={14} />,
  RECORDED_LECTURE: <Video size={14} />,
  PRACTICE_SET: <BookOpen size={14} />,
  ASSIGNMENT: <BookOpen size={14} />,
  EXTERNAL_LINK: <ExternalLink size={14} />,
};

export default async function ResourcesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const resources = await getRecommendedResources(session.user.id);

  const grouped: Record<string, typeof resources> = {};
  for (const r of resources) {
    grouped[r.chapter] = grouped[r.chapter] ?? [];
    grouped[r.chapter].push(r);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[var(--text)]">Resources</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          Recommended based on your weak topics.
        </p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-[14px] text-[var(--text-muted)]">
          No resources available yet. Check back after your teacher uploads materials.
        </p>
      ) : (
        Object.entries(grouped).map(([chapter, items]) => (
          <div key={chapter} className="mb-7">
            <h2 className="text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
              {chapter}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {items.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.urlOrFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-[6px] px-4 py-3 hover:border-[var(--accent)] transition-colors shadow-[var(--shadow)]"
                >
                  <span className="text-[var(--accent)]">
                    {RESOURCE_ICONS[resource.type] ?? <LinkIcon size={14} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text)] truncate">{resource.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{resource.topic}</p>
                  </div>
                  <Badge variant="muted">{resource.type.replace("_", " ")}</Badge>
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
