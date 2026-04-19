'use client';

import { useState } from 'react';
import { Mail, Phone, Building2, Tag, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { crmApi, type CrmContact } from '@/lib/crm-api';
import { EditContactDialog } from '@/components/crm/edit-contact-dialog';

function initials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '') || '??').toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ContactHeader({
  contact,
  onRefresh,
}: {
  contact: CrmContact;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const onDelete = async () => {
    if (!confirm(`¿Eliminar a ${contact.full_name}?`)) return;
    try {
      await crmApi.deleteContact(contact.id);
      toast.success('Contacto eliminado');
      router.push('/crm/contacts');
    } catch {
      toast.error('Error');
    }
  };

  return (
    <div className="flex items-start gap-4">
      <Avatar className="h-20 w-20">
        <AvatarFallback className="text-xl">{initials(contact.full_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{contact.full_name}</h1>
            {contact.company && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {contact.company}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />
              Eliminar
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {contact.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {contact.phone}
            </span>
          )}
          <Badge variant="outline" className="text-[10px]">
            {contact.status}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            Source: {contact.source}
          </Badge>
        </div>

        {contact.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {contact.tags.map((t) => (
              <Badge key={t} variant="outline" className="gap-1 text-[10px]">
                <Tag className="h-2.5 w-2.5" />
                {t}
              </Badge>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          Alta: {formatDate(contact.created_at)} · Actualizado: {formatDate(contact.updated_at)}
        </p>
      </div>

      <EditContactDialog
        contact={contact}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onRefresh}
      />
    </div>
  );
}
