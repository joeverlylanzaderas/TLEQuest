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
  class_obj: number;
  teacher: string; // StringRelatedField — the teacher's __str__ output
  title: string;
  description: string;
  table_setting_type: string; // ⚠️ free text for now — real choices unknown, see model
  order_index: number;
  is_published: boolean;
  total_steps: number;
  steps: QuestStep[];
  created_at: string;
  updated_at: string;
}

export interface QuestCreatePayload {
  class_obj: number;
  title: string;
  description: string;
  table_setting_type: string;
  order_index: number;
  is_published: boolean;
}

export type QuestUpdatePayload = Partial<QuestCreatePayload>;