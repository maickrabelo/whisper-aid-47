import React from 'react';
import { ShieldOff, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SMS_UPGRADE_URL = 'https://pay.hotmart.com/Y106371701W?off=cxxuc6kw&checkoutMode=6';

// Preview-only page to visualize the expired SMS trial popup.
const PreviewTrialExpiredSMS: React.FC = () => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
    <Card className="w-full max-w-md border-border shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldOff className="h-8 w-8 text-destructive" />
        </div>
        <CardTitle className="text-2xl font-bold">
          Seu teste de 7 dias terminou
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-muted-foreground">
          Continue usando nosso software clicando no botão abaixo.
        </p>
        <Button
          size="lg"
          className="w-full"
          onClick={() => window.open(SMS_UPGRADE_URL, '_blank')}
        >
          Quero continuar usando!
        </Button>
        <button className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 mx-auto">
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </CardContent>
    </Card>
  </div>
);

export default PreviewTrialExpiredSMS;
