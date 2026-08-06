import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureAdAttribution, oaiqTrack } from '@/lib/openaiPixel';

/**
 * Dispara page_view do pixel do ChatGPT em cada troca de rota (SPA)
 * e captura os parâmetros de atribuição do anúncio na entrada.
 */
export const OpenAIPixelRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    captureAdAttribution();
    oaiqTrack('page_view');
  }, [location.pathname, location.search]);

  return null;
};
