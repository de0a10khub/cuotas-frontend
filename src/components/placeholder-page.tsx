import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </header>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
            <Construction className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Módulo en construcción</h2>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
            Esta pantalla se está implementando. La API de Django ya tiene los endpoints necesarios,
            solo falta conectar la UI.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
