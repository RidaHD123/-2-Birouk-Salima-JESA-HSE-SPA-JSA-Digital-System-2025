
export type Language = 'en' | 'fr' | 'ar';

export interface Hazard {
  id: string;
  description: string;
  limit: string; // e.g., "Noise > 85 dB"
}

export interface Control {
  id: string;
  description: string;
  type: 'PPE' | 'PROCEDURE' | 'STANDARD';
  standardRef?: string; // e.g., "ISO 45001"
}

export interface Tool {
  id: string;
  name: string;
  brandModel: string; // e.g., "Fluke 87V"
}

export interface Step {
  id: number;
  description: string;
  hazardRef?: string;
}

export interface JobLocation {
  name: string;
  emergencyPhone: string;
  musterPoint: string;
}

export interface RiskScore {
  likelihood: number; // 1-5
  severity: number; // 1-5
  score: number; // calculated
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface JSAData {
  id: string;
  title: {
    en: string;
    fr: string;
    ar: string;
  };
  metadata: {
    company: string;
    project: string;
    workOrder: string;
    teamLeader: string;
    teamMembers: string[]; // Added team members
  };
  category: string;
  locations: JobLocation[];
  hazards: Hazard[]; // Exactly 12
  tools: Tool[]; // Exactly 8
  controls: Control[]; // Exactly 8
  steps: Step[]; // Exactly 12
  initialRisk: RiskScore;
  residualRisk: RiskScore;
  requiredPermits: string[];
}

export interface SignatureData {
  name: string;
  role: string;
  date: string;
  signatureImage: string | null; // Base64
}

export interface AppState {
  currentJSA: JSAData | null;
  language: Language;
  mode: 'search' | 'edit' | 'preview';
  signatures: {
    creator: SignatureData;
    supervisor: SignatureData;
    manager: SignatureData;
  };
  isLoading: boolean;
}