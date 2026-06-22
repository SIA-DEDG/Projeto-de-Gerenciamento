export type StatusGroup = 'pending' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: string;
  category: string;
  activity: string;
  description?: string;
  responsible_id?: string | null;   // UUID FK — used when sending to API
  responsible: string;              // name from JOIN — used for display
  status: string;
  priority: string;
  created_at: string;
  project_id?: string | null;
  co_responsibles?: string | null;    // JSON array of names from junction — display only
  co_responsible_ids?: string | null; // JSON array of UUIDs from junction — used for updates
  external_collaborators?: string | null;
  deadline?: string | null;
  // enriched client-side
  status_group: StatusGroup;
  badge_color: string;
  date: string;
}

export interface Project {
  id: string;
  name: string;
  category?: string;
  owner_id?: string | null;   // UUID FK — used when sending to API
  owner?: string | null;      // name from JOIN — used for display
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
  notificationProfile: string;
  alertChannel: string;
  refreshInterval: string;
  emailEnabled: boolean;
}
