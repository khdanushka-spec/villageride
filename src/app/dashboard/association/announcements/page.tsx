import { prisma } from "@/lib/prisma";
import { requireAssociationForAdmin } from "@/lib/association-admin";
import { AnnouncementForm } from "@/components/association/announcement-form";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AssociationAnnouncementsPage() {
  const association = await requireAssociationForAdmin();

  const announcements = await prisma.announcement.findMany({
    where: { associationId: association.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">Send updates to every driver in your association.</p>
      </div>

      <AnnouncementForm />

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Megaphone className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(a.createdAt)}
              </p>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No announcements posted yet.
          </p>
        )}
      </div>
    </div>
  );
}
