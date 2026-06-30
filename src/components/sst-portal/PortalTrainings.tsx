import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Play, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
  return m ? m[1] : null;
};


interface Training {
  id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  category: string;
  created_at: string;
}

const PortalTrainings = () => {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase
        .from("sst_portal_trainings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrainings(data || []);
    } catch (error) {
      console.error("Error fetching trainings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (trainings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted rounded-full p-4 mb-4">
          <GraduationCap className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">Nenhum treinamento disponível</h3>
        <p className="text-muted-foreground text-sm">
          Os treinamentos serão disponibilizados em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {trainings.map((training) => (
        <Card key={training.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <div className="relative h-40 bg-muted flex items-center justify-center">
            {training.thumbnail_url ? (
              <img
                src={training.thumbnail_url}
                alt={training.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Play className="h-10 w-10" />
              </div>
            )}
            {training.duration_minutes && (
              <Badge className="absolute bottom-2 right-2 bg-background/90 text-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(training.duration_minutes)}
              </Badge>
            )}
          </div>
          <CardContent className="p-4 space-y-2">
            <h4 className="font-semibold line-clamp-2">{training.title}</h4>
            {training.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {training.description}
              </p>
            )}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {format(new Date(training.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
              {training.content_url && (
                <Button
                  size="sm"
                  onClick={() => window.open(training.content_url!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Acessar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PortalTrainings;
