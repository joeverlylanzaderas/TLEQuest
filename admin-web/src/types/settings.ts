export interface SystemSettings {
  school_name: string;
  school_year: string;
  primary_color: string;
  min_password_length: number;
  bulk_upload_enabled: boolean;
  self_service_password_reset_enabled: boolean;
  updated_at: string;
}

export type SystemSettingsUpdate = Partial<Omit<SystemSettings, 'updated_at'>>;