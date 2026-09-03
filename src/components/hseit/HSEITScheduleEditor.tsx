import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, CalendarRange } from "lucide-react";
import type { ActionItem } from "./HSEITActionPlanEditor";
import { HSEIT_CATEGORY_LABELS, HSEITCategory } from "@/data/hseitQuestions";

export const MONTH_LABELS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** Valores padrão do cronograma mensal quando o usuário ainda não editou a ação */
export function getMonthlyPlan(item: ActionItem) {
  const defaultStart = item.priority === 'immediate' ? 0 : item.priority === 'short_term' ? 1 : 3;
  const defaultDuration = item.priority === 'immediate' ? 3 : item.priority === 'short_term' ? 5 : 6;
  const start = typeof item.startMonth === 'number' ? item.startMonth : defaultStart;
  const duration = typeof item.durationMonths === 'number' && item.durationMonths > 0 ? item.durationMonths : defaultDuration;
  return {
    responsible: (item.responsible || '').trim() || 'RH/SST',
    startMonth: Math.min(11, Math.max(0, start)),
    durationMonths: Math.min(12 - Math.min(11, Math.max(0, start)), duration),
  };
}

interface MonthlyPlanEditorProps {
  actionItems: ActionItem[];
  onUpdate: (items: ActionItem[]) => void;
}

function MonthlyPlanEditor({ actionItems, onUpdate }: MonthlyPlanEditorProps) {
  const patch = (id: string, changes: Partial<ActionItem>) =>
    onUpdate(actionItems.map(i => (i.id === id ? { ...i, ...changes } : i)));

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarRange className="h-4 w-4" /> Cronograma Mensal do Plano de Ação
        </h3>
        <p className="text-sm text-muted-foreground">
          Define o responsável, o mês de início e a duração (em meses) de cada ação — exatamente como sai na tabela mensal do PDF.
        </p>
      </div>

      {actionItems.length === 0 ? (
        <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
          Nenhuma ação no plano. Adicione ações na aba "Plano de Ação" para editar o cronograma mensal.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40%]">Ação / Medida</TableHead>
                <TableHead className="w-[22%]">Responsável</TableHead>
                <TableHead className="w-[19%]">Início</TableHead>
                <TableHead className="w-[19%]">Duração (meses)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actionItems.map(item => {
                const plan = getMonthlyPlan(item);
                const endMonth = plan.startMonth + plan.durationMonths - 1;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="align-top">
                      <p className="text-xs font-semibold text-primary">
                        [{HSEIT_CATEGORY_LABELS[item.category as HSEITCategory] || 'Ação'}]
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {item.description || item.recommendation || 'Sem descrição'}
                      </p>
                      <div className="mt-2 flex gap-[2px]">
                        {MONTH_LABELS.map((mo, i) => (
                          <span
                            key={mo}
                            title={mo}
                            className={`h-3 w-3 rounded-sm ${i >= plan.startMonth && i <= endMonth ? 'bg-green-600' : 'bg-muted'}`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={item.responsible ?? ''}
                        onChange={(e) => patch(item.id, { responsible: e.target.value })}
                        placeholder="RH/SST"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Select
                        value={String(plan.startMonth)}
                        onValueChange={(v) => patch(item.id, { startMonth: Number(v) })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTH_LABELS.map((mo, i) => (
                            <SelectItem key={mo} value={String(i)}>{mo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-top">
                      <Select
                        value={String(plan.durationMonths)}
                        onValueChange={(v) => patch(item.id, { durationMonths: Number(v) })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 - plan.startMonth }, (_, i) => i + 1).map(n => (
                            <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'mês' : 'meses'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export interface ScheduleItem {
  id: string;
  action: string;
  deadline: string;
  responsible: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface HSEITScheduleEditorProps {
  scheduleItems: ScheduleItem[];
  onUpdate: (items: ScheduleItem[]) => void;
  actionItems?: ActionItem[];
  onUpdateActionItems?: (items: ActionItem[]) => void;
}

const STATUS_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído'
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800'
};

export function HSEITScheduleEditor({ scheduleItems, onUpdate, actionItems, onUpdateActionItems }: HSEITScheduleEditorProps) {
  const addItem = () => {
    const newItem: ScheduleItem = {
      id: crypto.randomUUID(),
      action: '',
      deadline: '',
      responsible: '',
      status: 'pending'
    };
    onUpdate([...scheduleItems, newItem]);
  };

  const updateItem = (id: string, field: keyof ScheduleItem, value: string) => {
    onUpdate(scheduleItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    onUpdate(scheduleItems.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cronograma Sugerido</h3>
        <Button onClick={addItem} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      {scheduleItems.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <p>Nenhum item no cronograma.</p>
          <p className="text-sm">Clique em "Adicionar Item" para começar.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[35%]">Ação</TableHead>
                <TableHead className="w-[20%]">Prazo</TableHead>
                <TableHead className="w-[20%]">Responsável</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[10%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduleItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      value={item.action}
                      onChange={(e) => updateItem(item.id, 'action', e.target.value)}
                      placeholder="Descreva a ação..."
                      className="border-0 bg-transparent focus-visible:ring-1"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.deadline}
                      onChange={(e) => updateItem(item.id, 'deadline', e.target.value)}
                      placeholder="Ex: 30/01/2025"
                      className="border-0 bg-transparent focus-visible:ring-1"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.responsible}
                      onChange={(e) => updateItem(item.id, 'responsible', e.target.value)}
                      placeholder="Nome/Cargo"
                      className="border-0 bg-transparent focus-visible:ring-1"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.status}
                      onValueChange={(value) => updateItem(item.id, 'status', value)}
                    >
                      <SelectTrigger className="border-0 bg-transparent">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[key as ScheduleItem['status']]}`}>
                              {label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Dica: Defina prazos realistas e atribua responsáveis claros para cada ação.
      </p>

      {actionItems && onUpdateActionItems && (
        <div className="pt-4 border-t">
          <MonthlyPlanEditor actionItems={actionItems} onUpdate={onUpdateActionItems} />
        </div>
      )}
    </div>
  );
}
