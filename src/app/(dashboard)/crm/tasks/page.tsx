import { TasksList } from '@/components/crm/tasks-list';

export default function CrmTasksPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mis Tareas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona tus actividades pendientes.
        </p>
      </header>
      <TasksList />
    </div>
  );
}
