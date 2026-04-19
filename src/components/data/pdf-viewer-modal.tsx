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
export function PdfViewerModal({ open, url, title, description, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex h-[85vh] max-h-[85vh] w-[90vw] max-w-5xl flex-col gap-3 p-4">
        <DialogHeader>
          <DialogTitle>{title || 'Visor de documento'}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {url ? (
          <>
            <iframe
              src={url}
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
