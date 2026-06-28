import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

interface MaterialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  sstManagerId: string;
  onSaved: () => void;
}

const MaterialForm: React.FC<MaterialFormProps> = ({ open, onOpenChange, moduleId, sstManagerId, onSaved }) => {
  const [type, setType] = useState<'video' | 'pdf' | 'article'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [duration, setDuration] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setType('video');
    setTitle('');
    setDescription('');
    setContentUrl('');
    setArticleContent('');
    setDuration('');
    setPdfFile(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let finalContentUrl: string | null = null;

      if (type === 'video') {
        if (!contentUrl.trim()) {
          toast({ title: 'Link do vídeo é obrigatório', variant: 'destructive' });
          setSaving(false);
          return;
        }
        finalContentUrl = contentUrl.trim();
      } else if (type === 'pdf') {
        if (!pdfFile) {
          toast({ title: 'Selecione um arquivo PDF', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (pdfFile.size > 25 * 1024 * 1024) {
          toast({ title: 'Arquivo grande demais', description: 'O PDF deve ter no máximo 25MB.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        // Sanitize filename — Supabase storage rejects accents/spaces/special chars
        const lastDot = pdfFile.name.lastIndexOf('.');
        const baseName = lastDot > 0 ? pdfFile.name.slice(0, lastDot) : pdfFile.name;
        const ext = lastDot > 0 ? pdfFile.name.slice(lastDot + 1) : 'pdf';
        const safeBase = (baseName || 'arquivo')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 80) || 'arquivo';
        const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'pdf';
        const safeName = `${safeBase}.${safeExt}`;
        const path = `${sstManagerId}/${moduleId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from('sst-trainings')
          .upload(path, pdfFile, { contentType: pdfFile.type || 'application/pdf', upsert: false });
        if (upErr) throw upErr;
        finalContentUrl = path;
      }

      const { error } = await supabase.from('sst_training_materials').insert({
        module_id: moduleId,
        title: title.trim(),
        description: description.trim() || null,
        material_type: type,
        content_url: finalContentUrl,
        article_content: type === 'article' ? articleContent : null,
        duration_minutes: duration ? parseInt(duration) : null,
      });
      if (error) throw error;

      toast({ title: 'Material adicionado!' });
      reset();
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Material</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Vídeo (YouTube)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="article">Artigo (texto)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Introdução à NR-01" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {type === 'video' && (
            <div>
              <Label>Link do YouTube *</Label>
              <Input
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}

          {type === 'pdf' && (
            <div>
              <Label>Arquivo PDF *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {pdfFile && <p className="text-xs text-muted-foreground mt-1">{pdfFile.name}</p>}
            </div>
          )}

          {type === 'article' && (
            <div>
              <Label>Conteúdo do artigo *</Label>
              <Textarea
                value={articleContent}
                onChange={(e) => setArticleContent(e.target.value)}
                rows={10}
                placeholder="Escreva o conteúdo do artigo aqui..."
              />
            </div>
          )}

          <div>
            <Label>Duração (minutos)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialForm;
