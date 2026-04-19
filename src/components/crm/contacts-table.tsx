'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { MoreHorizontal, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { crmApi, type CrmContact } from '@/lib/crm-api';
import { CreateContactDialog } from './create-contact-dialog';
import { EditContactDialog } from './edit-contact-dialog';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  qualified: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  proposal: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  negotiation: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  lost: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

function initials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return (first + second || '??').toUpperCase();
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function ContactsTable() {
  const router = useRouter();
  const sp = useSearchParams();
  const search = sp.get('search') || '';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const limit = 10;

  const [pendingSearch, setPendingSearch] = useState(search);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CrmContact | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => setPendingSearch(search), [search]);

  const pushParams = useCallback(
    (next: Record<string, string>) => {
      const q = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(next)) {
        if (!v) q.delete(k);
        else q.set(k, v);
      }
      router.push(`/crm/contacts${q.toString() ? `?${q}` : ''}`);
    },
    [router, sp],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.contacts({ page, limit, search });
      setContacts(res.data);
      setTotal(res.count);
    } catch {
      toast.error('Error cargando contactos');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const cleaned = pendingSearch.trim();
    if (cleaned === search) return;
    const t = setTimeout(() => pushParams({ search: cleaned, page: '1' }), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearch]);

  const onDelete = async (c: CrmContact) => {
    if (!confirm(`¿Eliminar a ${c.full_name}?`)) return;
    try {
      await crmApi.deleteContact(c.id);
      toast.success('Contacto eliminado');
      load();
    } catch {
      toast.error('Error eliminando');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={pendingSearch}
            onChange={(e) => setPendingSearch(e.target.value)}
            placeholder="Buscar nombre o email..."
            className="h-8 pl-7"
          />
        </div>
        <CreateContactDialog onCreated={load} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: 250 }}>Nombre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Fecha Alta</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!loading && contacts.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                Sin contactos.
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            contacts.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials(c.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        href={`/crm/contacts/${c.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {c.full_name}
                      </Link>
                      {c.company && (
                        <p className="text-xs text-muted-foreground">{c.company}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${STATUS_STYLES[c.status] || ''}`}
                  >
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{c.email || '—'}</TableCell>
                <TableCell className="text-xs">{c.phone || '—'}</TableCell>
                <TableCell className="text-xs">{formatDate(c.created_at)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/crm/contacts/${c.id}`)}
                      >
                        <Eye className="mr-2 h-3.5 w-3.5" /> Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(c);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(c)}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {total} contacto{total !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pushParams({ page: String(page - 1) })}
            >
              Anterior
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: String(page + 1) })}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <EditContactDialog
        contact={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={load}
      />
    </div>
  );
}
