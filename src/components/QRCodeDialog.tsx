import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { QrCode, Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDialogProps {
  url: string;
  title?: string;
  subtitle?: string;
  filenameBase?: string;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  disabled?: boolean;
}

export const QRCodeDialog: React.FC<QRCodeDialogProps> = ({
  url,
  title = 'Canal de Denúncias',
  subtitle,
  filenameBase = 'qrcode-ouvidoria',
  triggerLabel = 'Baixar QR Code',
  triggerVariant = 'outline',
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 320,
        margin: 2,
        color: { dark: '#065f46', light: '#ffffff' },
      }).catch((e) => console.error(e));
    }
  }, [open, url]);

  const downloadPNG = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 1024,
        margin: 2,
        color: { dark: '#065f46', light: '#ffffff' },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${filenameBase}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'QR Code (PNG) baixado' });
    } catch (e) {
      toast({ title: 'Erro ao gerar PNG', variant: 'destructive' });
    }
  };

  const downloadPDF = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 1024,
        margin: 2,
        color: { dark: '#065f46', light: '#ffffff' },
      });
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      pdf.setFontSize(20);
      pdf.setTextColor(6, 95, 70);
      pdf.text(title, pageW / 2, 30, { align: 'center' });
      if (subtitle) {
        pdf.setFontSize(12);
        pdf.setTextColor(80, 80, 80);
        pdf.text(subtitle, pageW / 2, 40, { align: 'center' });
      }
      const size = 120;
      pdf.addImage(dataUrl, 'PNG', (pageW - size) / 2, 55, size, size);
      pdf.setFontSize(11);
      pdf.setTextColor(60, 60, 60);
      pdf.text('Aponte a câmera do celular para o QR Code', pageW / 2, 190, { align: 'center' });
      pdf.text('ou acesse o link abaixo:', pageW / 2, 197, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setTextColor(6, 95, 70);
      pdf.text(url, pageW / 2, 207, { align: 'center', maxWidth: pageW - 20 });
      pdf.save(`${filenameBase}.pdf`);
      toast({ title: 'QR Code (PDF) baixado' });
    } catch (e) {
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} disabled={disabled}>
          <QrCode className="h-4 w-4 mr-2" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <canvas ref={canvasRef} className="rounded-lg border" />
          <p className="text-xs text-muted-foreground break-all text-center px-4">{url}</p>
          <div className="flex gap-2 w-full justify-center">
            <Button onClick={downloadPNG}>
              <Download className="h-4 w-4 mr-2" /> Baixar PNG
            </Button>
            <Button onClick={downloadPDF} variant="outline">
              <FileText className="h-4 w-4 mr-2" /> Baixar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeDialog;
