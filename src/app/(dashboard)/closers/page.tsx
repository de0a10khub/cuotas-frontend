import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function ClosersLanding() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Closers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Área del equipo comercial.</p>
      </header>

      <Link href="/closers/admin" className="block">
        <Card className="cursor-pointer transition-all hover:border-violet-300 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-md bg-violet-100 p-2 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
                <Users className="h-4 w-4" />
              </div>
              Gestión del equipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Crear closers, asignar PINs, ver estadísticas del equipo.
            </p>
            <p className="mt-2 text-sm font-medium text-violet-600">Abrir admin →</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
