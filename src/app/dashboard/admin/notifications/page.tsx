import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { BroadcastNotificationForm } from "@/components/admin/broadcast-notification-form";

export default async function AdminNotificationsPage() {
  await requireSuperAdminSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Broadcast a message to everyone on the platform, or one role.</p>
      </div>
      <BroadcastNotificationForm />
    </div>
  );
}
