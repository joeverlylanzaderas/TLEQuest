// mobile/src/types/quests.ts
export interface QuestStepChecklistItem {
  id: number;
  checklist_text: string;
  order_index: number;
}

export interface QuestStep {
  id: number;
  step_order: number;
  title: string;
  instruction: string;
  image_hint: string;
  is_final_step: boolean;
  is_required: boolean;
  checklist_items: QuestStepChecklistItem[];
  points: number;      // points this step awards (0 = none)
  badge_name: string;  // badge this step awards ('' = none)
}

export interface Quest {
  id: number;
  classes: number[]; // was class_obj: number — now a list of class IDs
  teacher: string;
  title: string;
  description: string;
  table_setting_type: string;
  order_index: number;
  is_published: boolean;
  cover_image_url: string;
  total_steps: number;
  steps: QuestStep[];
  created_at: string;
  updated_at: string;
}

export interface QuestCreatePayload {
  classes: number[]; // was class_obj: number
  title: string;
  description: string;
  table_setting_type: string;
  order_index: number;
  is_published: boolean;
  cover_image_url?: string;
}

export type QuestUpdatePayload = Partial<QuestCreatePayload>;

export type TableSettingType = 'table_setting' | 'napkin_folding';

export interface QuestStepCreatePayload {
  step_order: number;
  title: string;
  instruction: string;
  is_final_step: boolean; // the server always makes the LAST step the final one
  is_required: boolean;
  points?: number;        // omit = unchanged, 0 = remove
  badge_name?: string;    // omit = unchanged, '' = remove
}

export type QuestStepUpdatePayload = Partial<QuestStepCreatePayload>;

export interface ChecklistItemCreatePayload {
  checklist_text: string;
  order_index: number;
}