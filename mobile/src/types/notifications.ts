export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  related_type: string | null;
  related_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}