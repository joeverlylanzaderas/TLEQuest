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
}

export type QuestUpdatePayload = Partial<QuestCreatePayload>;

export type TableSettingType = 'table_setting' | 'napkin_folding';

export interface QuestStepCreatePayload {
  step_order: number;
  title: string;
  instruction: string;
  is_final_step: boolean;
  is_required: boolean;
}

export type QuestStepUpdatePayload = Partial<QuestStepCreatePayload>;

export interface ChecklistItemCreatePayload {
  checklist_text: string;
  order_index: number;
}