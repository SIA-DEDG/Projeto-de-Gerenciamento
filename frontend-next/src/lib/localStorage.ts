import type { Category, TeamMember, EvidenceMap, Settings } from '@/types';

const KEYS = {
  categories: 'sia_categories_v1',
  teamMembers: 'sia_team_members_v1',
  evidence: 'sia_project_evidence_v1',
  settings: 'sia_system_settings_v1',
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Categories ────────────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES: Category[] = [
  { name: '1. PACTO pela Economia', color: 'blue' },
  { name: '2. TOOLKIT', color: 'teal' },
  { name: '3. APRESENTAÇÕES', color: 'orange' },
  { name: '4. INDICADORES', color: 'green' },
  { name: '5. PROJETOS INTERNOS', color: 'purple' },
  { name: '6. COMUNICAÇÃO', color: 'red' },
  { name: '7. EMPREENDEDOR', color: 'yellow' },
  { name: '8. REPRESENTAÇÃO INSTITUCIONAL', color: 'blue' },
  { name: '9. CAPACITIA', color: 'teal' },
  { name: '10. EDUCAÇÃO E INOVAÇÃO', color: 'green' },
];

export function getCategories(): Category[] {
  return get<Category[]>(KEYS.categories, DEFAULT_CATEGORIES);
}

export function saveCategories(cats: Category[]): void {
  set(KEYS.categories, cats);
}

export function addCategory(name: string, color: string): Category[] {
  const cats = getCategories();
  if (!cats.find((c) => c.name === name)) cats.push({ name, color });
  saveCategories(cats);
  return cats;
}

export function deleteCategory(name: string): Category[] {
  const cats = getCategories().filter((c) => c.name !== name);
  saveCategories(cats);
  return cats;
}

// ── Team Members ──────────────────────────────────────────────────────────────

const DEFAULT_TEAM: TeamMember[] = [
  { name: 'Ingrid', role: 'Coordenadora' },
  { name: 'Gabriel', role: 'Analista' },
  { name: 'Luís', role: 'Técnico' },
  { name: 'Rebeca', role: 'Comunicação' },
];

export function getTeamMembers(): TeamMember[] {
  return get<TeamMember[]>(KEYS.teamMembers, DEFAULT_TEAM);
}

export function saveTeamMembers(members: TeamMember[]): void {
  set(KEYS.teamMembers, members);
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export function getEvidence(): EvidenceMap {
  return get<EvidenceMap>(KEYS.evidence, {});
}

export function saveEvidence(ev: EvidenceMap): void {
  set(KEYS.evidence, ev);
}

// ── Settings ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  notificationProfile: 'completo',
  alertChannel: 'email',
  refreshInterval: '15',
  emailEnabled: true,
};

export function getSettings(): Settings {
  return get<Settings>(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(s: Settings): void {
  set(KEYS.settings, s);
}
