import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { HSEITCategory, HSEIT_CATEGORY_LABELS } from "@/data/hseitQuestions";

export interface ActionItem {
  id: string;
  category: HSEITCategory;
  priority: 'immediate' | 'short_term' | 'medium_term';
  description: string;
  recommendation: string;
  /** Responsável exibido no cronograma mensal do PDF (padrão: RH/SST) */
  responsible?: string;
  /** Mês inicial (0 = JAN) no cronograma mensal */
  startMonth?: number;
  /** Duração em meses no cronograma mensal */
  durationMonths?: number;
}

interface HSEITActionPlanEditorProps {
  actionItems: ActionItem[];
  onUpdate: (items: ActionItem[]) => void;
}

const PRIORITY_LABELS = {
  immediate: 'Imediato (até 30 dias)',
  short_term: 'Curto Prazo (1-3 meses)',
  medium_term: 'Médio Prazo (3-6 meses)'
};

const PRIORITY_COLORS = {
  immediate: 'bg-red-100 border-red-300 text-red-800',
  short_term: 'bg-orange-100 border-orange-300 text-orange-800',
  medium_term: 'bg-yellow-100 border-yellow-300 text-yellow-800'
};

export function HSEITActionPlanEditor({ actionItems, onUpdate }: HSEITActionPlanEditorProps) {
  const addItem = () => {
    const newItem: ActionItem = {
      id: crypto.randomUUID(),
      category: 'demands',
      priority: 'short_term',
      description: '',
      recommendation: ''
    };
    onUpdate([...actionItems, newItem]);
  };

  const updateItem = (id: string, field: keyof ActionItem, value: string) => {
    onUpdate(actionItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    onUpdate(actionItems.filter(item => item.id !== id));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...actionItems];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onUpdate(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Plano de Ação</h3>
        <Button onClick={addItem} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Ação
        </Button>
      </div>

      {actionItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Nenhuma ação definida.</p>
            <p className="text-sm">Clique em "Adicionar Ação" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {actionItems.map((item, index) => (
            <Card key={item.id} className={`border-l-4 ${PRIORITY_COLORS[item.priority]}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Ação #{index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === actionItems.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria</label>
                    <Select
                      value={item.category}
                      onValueChange={(value) => updateItem(item.id, 'category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(HSEIT_CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select
                      value={item.priority}
                      onValueChange={(value) => updateItem(item.id, 'priority', value as ActionItem['priority'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição do Problema</label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Descreva o problema identificado..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Recomendação / Ação Proposta</label>
                  <Textarea
                    value={item.recommendation}
                    onChange={(e) => updateItem(item.id, 'recommendation', e.target.value)}
                    placeholder="Descreva a ação recomendada para mitigar o problema..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
