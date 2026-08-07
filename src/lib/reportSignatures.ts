export interface ReportSignatures {
  technicianName: string;
  technicianCpf: string;
  technicianRegistration: string;
  orgResponsibleName: string;
  orgResponsibleCpf: string;
  orgResponsibleRole: string;
}

export const EMPTY_SIGNATURES: ReportSignatures = {
  technicianName: '',
  technicianCpf: '',
  technicianRegistration: '',
  orgResponsibleName: '',
  orgResponsibleCpf: '',
  orgResponsibleRole: '',
};

const key = (scope: string) => `report-signatures:${scope}`;

export function loadSignatures(scope: string): ReportSignatures {
  try {
    const raw = localStorage.getItem(key(scope));
    if (!raw) return { ...EMPTY_SIGNATURES };
    return { ...EMPTY_SIGNATURES, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_SIGNATURES };
  }
}

export function saveSignatures(scope: string, value: ReportSignatures): void {
  try {
    localStorage.setItem(key(scope), JSON.stringify(value));
  } catch {
    /* noop */
  }
}
