import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Loader2, GraduationCap, Trash2, Users, FileText, Video, FileType } from 'lucide-react';
import ModuleCard from '@/components/sst-trainings/ModuleCard';
import MaterialForm from '@/components/sst-trainings/MaterialForm';
import CompanyAccessDialog from '@/components/sst-trainings/CompanyAccessDialog';
import MaterialViewer from '@/components/sst-trainings/MaterialViewer';

interface Module {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  materialCount?: number;
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  material_type: 'video' | 'pdf' | 'article';
  content_url: string | null;
  article_content: string | null;
  duration_minutes: number | null;
}

const SSTTrainings: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = useRealAuth();
  const { toast } = useToast();
  const [sstManagerId, setSstManagerId] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);

  // Module form
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [savingModule, setSavingModule] = useState(false);

  // Material form
  const [materialFormOpen, setMaterialFormOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== 'sst') { navigate('/auth'); return; }
    init();
  }, [user, role, authLoading]);

  const init = async () => {
    setLoading(true);
    const { data: prof } = await supabase.from('profiles').select('sst_manager_id').eq('id', user!.id).single();
    if (!prof?.sst_manager_id) { setLoading(false); return; }
    setSstManagerId(prof.sst_manager_id);
    await loadModules(prof.sst_manager_id);
    setLoading(false);
  };

  const loadModules = async (mgrId: string) => {
    const { data, error } = await supabase
      .from('sst_training_modules')
      .select('id, title, description, cover_image_url')
      .eq('sst_manager_id', mgrId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[SSTTrainings] loadModules error:', error); return; }
    const base = (data || []) as Module[];
    const counts = await Promise.all(
      base.map((m) =>
        supabase.rpc('count_training_materials', { _module_id: m.id }).then(r => r.data ?? 0)
      )
    );
    setModules(base.map((m, i) => ({ ...m, materialCount: counts[i] as number })));
  };

  const loadMaterials = async (moduleId: string) => {
    const { data } = await supabase
      .from('sst_training_materials')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index')
      .order('created_at');
    setMaterials((data as Material[]) || []);
  };

  const openModule = async (m: Module) => {
    setSelectedModule(m);
    await loadMaterials(m.id);
  };

  const handleCreateModule = async () => {
    if (!sstManagerId || !newTitle.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    setSavingModule(true);
    try {
      let coverUrl: string | null = null;
      if (coverFile) {
        const safeName = (coverFile.name || 'cover')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .replace(/_+/g, '_');
        const path = `${sstManagerId}/covers/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from('sst-trainings').upload(path, coverFile);
        if (upErr) { console.error('[SSTTrainings] upload error:', upErr); throw upErr; }
        const { data } = await supabase.storage.from('sst-trainings').createSignedUrl(path, 60 * 60 * 24 * 365);
        coverUrl = data?.signedUrl ?? null;
      }
      const { data: inserted, error } = await supabase
        .from('sst_training_modules')
        .insert({
          sst_manager_id: sstManagerId,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          cover_image_url: coverUrl,
        })
        .select()
        .single();
      if (error) throw error;
      console.log('[SSTTrainings] Módulo criado:', inserted);
      toast({ title: 'Módulo criado!' });
      setModuleFormOpen(false);
      setNewTitle(''); setNewDescription(''); setCoverFile(null);
      await loadModules(sstManagerId);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSavingModule(false);
    }
  };

  const deleteModule = async (id: string) => {
    if (!confirm('Excluir este módulo e todos os seus materiais?')) return;
    const { error } = await supabase.from('sst_training_modules').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Módulo excluído' });
    if (sstManagerId) loadModules(sstManagerId);
    setSelectedModule(null);
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('Excluir este material?')) return;
    const { error } = await supabase.from('sst_training_materials').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Material excluído' });
    if (selectedModule) loadMaterials(selectedModule.id);
  };

  const iconFor = (t: string) => {
    if (t === 'video') return <Video className="h-4 w-4" />;
    if (t === 'pdf') return <FileType className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 audit-container py-8">
        {!selectedModule ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/sst-dashboard')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-primary" /> Treinamentos
                  </h1>
                  <p className="text-sm text-muted-foreground">Crie módulos educativos para suas empresas</p>
                </div>
              </div>
              <Button onClick={() => setModuleFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Novo Módulo
              </Button>
            </div>

            {modules.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">
                Nenhum módulo criado ainda. Clique em "Novo Módulo" para começar.
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map(m => (
                  <ModuleCard
                    key={m.id}
                    title={m.title}
                    description={m.description}
                    coverImageUrl={m.cover_image_url}
                    materialCount={m.materialCount}
                    onClick={() => openModule(m)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setSelectedModule(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">{selectedModule.title}</h1>
                  {selectedModule.description && (
                    <p className="text-sm text-muted-foreground">{selectedModule.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAccessDialogOpen(true)}>
                  <Users className="h-4 w-4 mr-2" /> Gerenciar Acesso
                </Button>
                <Button variant="outline" onClick={() => deleteModule(selectedModule.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir Módulo
                </Button>
                <Button onClick={() => setMaterialFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Material
                </Button>
              </div>
            </div>

            {materials.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Nenhum material neste módulo. Adicione vídeos, PDFs ou artigos.
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {materials.map(m => (
                  <Card key={m.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {iconFor(m.material_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {m.material_type === 'pdf' ? 'PDF' : m.material_type === 'video' ? 'Vídeo' : 'Artigo'}
                          {m.duration_minutes ? ` • ${m.duration_minutes} min` : ''}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setViewMaterial(m)}>Ver</Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMaterial(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {sstManagerId && (
              <>
                <MaterialForm
                  open={materialFormOpen}
                  onOpenChange={setMaterialFormOpen}
                  moduleId={selectedModule.id}
                  sstManagerId={sstManagerId}
                  onSaved={() => loadMaterials(selectedModule.id)}
                />
                <CompanyAccessDialog
                  open={accessDialogOpen}
                  onOpenChange={setAccessDialogOpen}
                  moduleId={selectedModule.id}
                  sstManagerId={sstManagerId}
                />
              </>
            )}
          </>
        )}
      </main>
      <Footer />

      {/* Create module dialog */}
      <Dialog open={moduleFormOpen} onOpenChange={setModuleFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Módulo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Imagem de capa (opcional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleFormOpen(false)} disabled={savingModule}>Cancelar</Button>
            <Button onClick={handleCreateModule} disabled={savingModule}>
              {savingModule && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material viewer */}
      <Dialog open={!!viewMaterial} onOpenChange={(o) => !o && setViewMaterial(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewMaterial?.title}</DialogTitle></DialogHeader>
          {viewMaterial?.description && (
            <p className="text-sm text-muted-foreground">{viewMaterial.description}</p>
          )}
          {viewMaterial && <MaterialViewer material={viewMaterial} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SSTTrainings;
