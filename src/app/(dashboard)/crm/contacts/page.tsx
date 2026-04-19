import { Card, CardContent } from '@/components/ui/card';
import { ContactsTable } from '@/components/crm/contacts-table';

export default function CrmContactsPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Contactos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión de todos los contactos y clientes potenciales.
        </p>
      </header>
      <Card>
        <CardContent className="p-4">
          <ContactsTable />
        </CardContent>
      </Card>
    </div>
  );
}
