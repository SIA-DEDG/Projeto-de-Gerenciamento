export type StatusGroup = 'pending' | 'in_progress' | 'review' | 'done';

export type TaskAttachment =
  | { type: 'file'; name: string; path: string; size: number; mimeType: string }
  | { type: 'link'; name: string; url: string };

export interface Task {
  id: string;
  category: string;
  activity: string;
  description?: string;
  responsible_id?: string | null;
  responsible: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at?: string;
  project_id?: string | null;
  co_responsibles?: string | null;
  co_responsible_ids?: string | null;
  external_collaborators?: string | null;
  deadline?: string | null;
  attachments?: TaskAttachment[];
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
