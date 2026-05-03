'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

interface Props {
  open: boolean;
  url: string | null;
  title?: string;
  description?: string;
  onClose: () => void;
}

// Visor de PDF in-app. Usamos <iframe> del propio navegador;
// si el PDF está en otro origen sin CORS puede caer al fallback (botón "Abrir en nueva pestaña").

// Drive sirve `/view` con X-Frame-Options: SAMEORIGIN (bloquea iframe cross-origin)
// pero `/preview` sí permite embedding. Convertimos la URL antes de pasarla al iframe.
function toEmbeddableUrl(url: string): string {
  // Match: https://drive.google.com/file/d/{ID}/(view|edit|...) → /preview
  const driveMatch = url.match(/^(https?:\/\/drive\.google\.com\/file\/d\/[^/]+)\/(?:view|edit|preview)?(\?.*)?$/);
  if (driveMatch) {
    return `${driveMatch[1]}/preview`;
  }
  // Match: https://drive.google.com/open?id=XXX → /file/d/XXX/preview
  const openMatch = url.match(/^https?:\/\/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) {
    return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  }
  // Cualquier otra URL Drive con /uc? también va a /file/d/ID/preview si extraemos el id.
  const ucMatch = url.match(/^https?:\/\/drive\.google\.com\/uc\?(?:[^&]*&)*id=([^&]+)/);
  if (ucMatch) {
    return `https://drive.google.com/file/d/${ucMatch[1]}/preview`;
  }
  return url;
}

export function PdfViewerModal({ open, url, title, description, onClose }: Props) {
  const embedUrl = url ? toEmbeddableUrl(url) : null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex h-[95vh] max-h-[95vh] w-[98vw] max-w-none flex-col gap-3 p-4 sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{title || 'Visor de documento'}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {url && embedUrl ? (
          <>
            <iframe
              src={embedUrl}
              title={title || 'PDF'}
              className="h-full w-full flex-1 rounded-md border border-slate-200 dark:border-slate-800"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir en nueva pestaña
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = '';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}
              >
                <Download className="h-4 w-4" />
                Descargar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Sin documento para mostrar.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
