export type PgrDocType = 'pgr' | 'pgtr';

export interface PgrTerminology {
  isRural: boolean;
  docType: PgrDocType;
  shortName: string;      // "PGR" | "PGRTR"
  fullName: string;
  regulation: string;     // "NR-01" | "NR-31"
  gheLabel: string;       // "GHE" | "GHER"
  gheLabelLong: string;
  addressLabel: string;
  createButtonLabel: string;
  emptyStateTitle: string;
}

export function usePgrTerminology(documentType?: string | null): PgrTerminology {
  const isRural = documentType === 'pgtr';
  if (isRural) {
    return {
      isRural: true,
      docType: 'pgtr',
      shortName: 'PGTR',
      fullName: 'Plano de Gerenciamento de Riscos do Trabalhador Rural',
      regulation: 'NR-31',
      gheLabel: 'GHER',
      gheLabelLong: 'Grupo Homogêneo de Exposição Rural',
      addressLabel: 'Localização da propriedade rural',
      createButtonLabel: 'Criar PGTR',
      emptyStateTitle: 'Nenhum PGTR criado para esta empresa',
    };
  }
  return {
    isRural: false,
    docType: 'pgr',
    shortName: 'PGR',
    fullName: 'Programa de Gerenciamento de Riscos',
    regulation: 'NR-01',
    gheLabel: 'GHE',
    gheLabelLong: 'Grupo Homogêneo de Exposição',
    addressLabel: 'Endereço completo',
    createButtonLabel: 'Criar PGR',
    emptyStateTitle: 'Nenhum PGR criado para esta empresa',
  };
}
