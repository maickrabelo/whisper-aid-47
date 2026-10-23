import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, ArrowRight, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const WHATSAPP_URL = 'https://wa.me/5527998443852?text=Estou%20usando%20o%20Software%20Sr.SMS%20e%20quero%20liberar%20o%20m%C3%B3dulo%20PCMSO%20e%20ASOS%20(Oferta%20Black)';

export default function PcmsoBlackCard({ unlocked }: { unlocked: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        id="tool-pcmso-black"
        role="button"
        tabIndex={0}
        onClick={() => (unlocked ? navigate('/pcmso') : setOpen(true))}
        onKeyDown={(e) => e.key === 'Enter' && (unlocked ? navigate('/pcmso') : setOpen(true))}
        className="group relative cursor-pointer overflow-hidden rounded-xl border-2 border-[hsl(142_100%_50%)] bg-[hsl(0_0%_4%)] p-6 text-[hsl(0_0%_98%)] shadow-[0_0_18px_hsl(142_100%_50%/0.55)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_32px_hsl(142_100%_50%/0.85)] animate-fade-in"
      >
        <div className="absolute right-3 top-3 rounded-full bg-[hsl(142_100%_50%)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[hsl(0_0%_4%)]">
          Oferta Black
        </div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[hsl(142_100%_50%/0.6)] bg-[hsl(142_100%_50%/0.1)]">
          {unlocked ? (
            <Activity className="h-6 w-6 text-[hsl(142_100%_50%)]" />
          ) : (
            <Lock className="h-6 w-6 text-[hsl(142_100%_50%)]" />
          )}
        </div>
        <h3 className="mb-1 text-lg font-bold">PCMSO e ASOS</h3>
        <p className="mb-1 text-sm font-extrabold uppercase tracking-wide text-[hsl(142_100%_50%)] [text-shadow:0_0_8px_hsl(142_100%_50%/0.8)]">
          Seja Platinum
        </p>
        <p className="mb-4 text-sm text-[hsl(0_0%_75%)]">Programa de Controle Médico de Saúde Ocupacional (NR-7)</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {['NR-7', 'ASO', 'S-2220'].map((h) => (
            <span key={h} className="rounded-full border border-[hsl(142_100%_50%/0.5)] px-2.5 py-1 text-xs font-medium text-[hsl(142_100%_50%)]">
              {h}
            </span>
          ))}
        </div>
        <div className="flex items-center text-sm font-semibold text-[hsl(142_100%_50%)]">
          {unlocked ? 'Acessar' : 'Desbloquear'} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>🔒 MÓDULO PCMSO E ASOS BLOQUEADO</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="font-bold">🔥 APROVEITE A OFERTA BLACK FRIDAY SR. SMS!</p>
            <p className="font-semibold">Libere todos os recursos do software, amplie seus serviços e tenha mais possibilidades de faturamento com seus clientes!</p>
            <div className="rounded-lg border p-3">
              <p className="font-bold">PLANO PREMIUM COMPLETO</p>
              <p className="font-bold">PGR + AEP + PCMSO e ASOS + LTCAT</p>
              <p>Até 20 empresas ou 2.000 vidas.</p>
              <p className="mt-1 font-bold">💰 R$ 197,90/mês</p>
            </div>
            <p>Para liberar o <strong>PCMSO e ASOS e o LTCAT</strong>, deixando o seu software com todos os módulos disponíveis, é necessário fazer a migração para o plano que inclui esses módulos.</p>
            <p className="font-semibold">O processo é simples:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li><strong>Acesse sua conta da Hotmart</strong> pelo link:{' '}
                <a href="https://consumer.hotmart.com/payments/" target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">https://consumer.hotmart.com/payments/</a></li>
              <li><strong>Entre utilizando o mesmo e-mail que você usou para realizar a compra do Sr. SMS.</strong> É importante utilizar o e-mail correto da compra para que a sua assinatura apareça na área de pagamentos.</li>
              <li>Após entrar na sua conta, clique em <strong>“Minhas compras”</strong>.</li>
              <li>Localize o <strong>Sr. SMS - Software PGR</strong>.</li>
              <li>Clique nos <strong>3 pontos</strong> ao lado da sua assinatura.</li>
              <li>Selecione a opção <strong>“Gestão de Pagamentos”</strong>.</li>
              <li>Vá em detalhes do Plano, clique em trocar de plano e escolha: <strong>PREMIUM: PGR + AEP + PCMSO e ASOS + LTCAT até 2 mil vidas ou 20 empresas!</strong></li>
            </ol>
            <p>💰 <strong>Você pagará somente a diferença proporcional neste mês.</strong></p>
            <p>A partir do próximo mês, a cobrança passará a ser de <strong>R$ 197,90/mês</strong>.</p>
            <p>Após concluir a troca, os <strong>módulos PCMSO e ASOS e LTCAT serão liberados no seu software</strong>.</p>
            <p className="font-semibold">Precisa de ajuda?</p>
            <p>Se tiver qualquer dificuldade para realizar a troca, podemos enviar o <strong>convite de troca de plano diretamente pelo WhatsApp</strong>. Nossa equipe poderá orientar você no processo.</p>
            <Button asChild className="w-full">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Solicitar troca pelo WhatsApp
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
