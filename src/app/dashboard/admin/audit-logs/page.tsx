import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  await requireSuperAdminSession();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit logs</h1>
        <p className="text-sm text-muted-foreground">Every sensitive action taken across the platform.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}
                </TableCell>
                <TableCell className="text-sm">{log.actor?.name ?? "System"}</TableCell>
                <TableCell className="text-sm font-medium">{log.action.replaceAll("_", " ").toLowerCase()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                </TableCell>
                <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                  {log.metadata ? JSON.stringify(log.metadata) : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {logs.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No audit events yet.</p>
        )}
      </div>
    </div>
  );
}
