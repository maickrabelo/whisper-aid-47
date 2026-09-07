import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { ClimateResponse } from '@/lib/climateSurveyStats';

interface Props {
  resp: ClimateResponse;
  index: number;
}

/** Um envio individual da Pesquisa de Clima, com demografia e todas as respostas. */
const ClimateResponseItem = ({ resp, index }: Props) => {
  const answered = resp.answers.filter(a => a.answer_value || a.answer_text).length;

  return (
    <AccordionItem value={resp.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex flex-wrap items-center gap-3 text-left">
          <Badge variant="secondary" className="shrink-0">#{index + 1}</Badge>
          <span className="text-sm">{resp.department?.trim() || 'Setor não informado'}</span>
          <span className="text-xs text-muted-foreground">
            {resp.completed_at
              ? new Date(resp.completed_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : 'Data não informada'}
          </span>
          <Badge variant="outline" className="text-xs">
            {answered}/{resp.answers.length} respostas
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2">
          {resp.demographics && Object.keys(resp.demographics).length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Dados Demográficos</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {resp.demographics.gender && (
                  <div><span className="text-muted-foreground">Gênero: </span>{resp.demographics.gender}</div>
                )}
                {resp.demographics.ageRange && (
                  <div><span className="text-muted-foreground">Idade: </span>{resp.demographics.ageRange}</div>
                )}
                {resp.demographics.tenure && (
                  <div><span className="text-muted-foreground">Tempo: </span>{resp.demographics.tenure}</div>
                )}
                {resp.demographics.education && (
                  <div><span className="text-muted-foreground">Escolaridade: </span>{resp.demographics.education}</div>
                )}
                {resp.demographics.role && (
                  <div><span className="text-muted-foreground">Cargo: </span>{resp.demographics.role}</div>
                )}
              </div>
            </div>
          )}

          {resp.answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este envio não possui respostas registradas no questionário.
            </p>
          ) : (
            <div className="space-y-3">
              {resp.answers.map((answer, ansIndex) => (
                <div key={ansIndex} className="border-l-2 border-primary/30 pl-4">
                  <p className="text-sm font-medium text-foreground mb-1">{answer.question_text}</p>
                  <div className="flex items-center gap-2">
                    {answer.answer_value && (answer.question_type === 'likert' || answer.question_type === 'unknown') && (
                      <Badge
                        variant={
                          parseInt(answer.answer_value) >= 4 ? 'default'
                            : parseInt(answer.answer_value) >= 3 ? 'secondary' : 'destructive'
                        }
                      >
                        {answer.answer_value}/5
                      </Badge>
                    )}
                    {answer.question_type === 'scale_0_10' && answer.answer_value && (
                      <Badge
                        variant={
                          parseInt(answer.answer_value) >= 9 ? 'default'
                            : parseInt(answer.answer_value) >= 7 ? 'secondary' : 'destructive'
                        }
                      >
                        NPS: {answer.answer_value}
                      </Badge>
                    )}
                    {answer.answer_text && (
                      <p className="text-sm text-muted-foreground italic">"{answer.answer_text}"</p>
                    )}
                    {!answer.answer_value && !answer.answer_text && (
                      <span className="text-xs text-muted-foreground">Não respondido</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default ClimateResponseItem;
