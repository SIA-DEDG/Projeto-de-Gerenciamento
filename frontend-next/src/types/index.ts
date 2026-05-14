export type StatusGroup = 'pending' | 'in_progress' | 'done';

export interface Task {
  id: number;
  category: string;
  activity: string;
  responsible: string;
  status: string;
  priority: string;
  created_at: string;
  // enriched client-side
  status_group: StatusGroup;
  badge_color: string;
  date: string;
}

export interface Project {
  id: number;
  name: string;
  category?: string;
  owner?: string;
  deadline?: string;
  executive_status?: string;
  objective?: string;
  scope?: string;
  summary?: string;
}

export interface Category {
  name: string;
  color: string;
}

export interface TeamMember {
  name: string;
  role: string;
}

export interface Evidence {
  type: string;
  fileName: string;
  note: string;
  createdAt: string;
}

export type EvidenceMap = Record<string, Evidence[]>;

export interface Settings {
  theme: string;
  notificationProfile: string;
  alertChannel: string;
  refreshInterval: string;
  emailEnabled: boolean;
}
