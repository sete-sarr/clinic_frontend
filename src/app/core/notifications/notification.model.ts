import { translatedLabels } from '../i18n/translated-labels';
import { CardTone } from '../../shared/components/record-card/record-card.model';

// Reflète communication.models.InAppNotification et communication/api/serializers.py (backend).
export type NotificationCategory = 'appointment' | 'laboratory' | 'hospitalization' | 'pharmacy' | 'billing' | 'system';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface InAppNotification {
  id: number;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export const NOTIFICATION_CATEGORY_LABELS = translatedLabels<NotificationCategory>('labels.notificationCategory', [
  'appointment', 'laboratory', 'hospitalization', 'pharmacy', 'billing', 'system',
]);

export const NOTIFICATION_PRIORITY_LABELS = translatedLabels<NotificationPriority>('labels.notificationPriority', [
  'low', 'medium', 'high', 'critical',
]);

export const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategory, string> = {
  appointment: 'event',
  laboratory: 'biotech',
  hospitalization: 'bed',
  pharmacy: 'medication',
  billing: 'receipt_long',
  system: 'info',
};

// Couleur d'une priorité (liseré + pastille, toujours accompagnée de son libellé).
export const NOTIFICATION_PRIORITY_TONES: Record<NotificationPriority, CardTone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};
