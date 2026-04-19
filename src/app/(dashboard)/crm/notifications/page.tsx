import { NotificationsList } from '@/components/crm/notifications-list';

export default function CrmNotificationsPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mantente al día con la actividad de tu CRM.
        </p>
      </header>

      <NotificationsList />
    </div>
  );
}
