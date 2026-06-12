import { useCallback } from 'react';

/**
 * Hook to format timestamps in a user-friendly way.
 * Returns relative time for recent messages, absolute time for older ones.
 * 
 * @returns A memoized formatter function
 * 
 * @example
 * ```tsx
 * function MessageTimestamp({ timestamp }: { timestamp: Date }) {
 *   const formatTimestamp = useFormatTimestamp();
 *   return <span>{formatTimestamp(timestamp)}</span>;
 * }
 * ```
 * 
 * Examples:
 * - "just now" (< 1 minute)
 * - "2 minutes ago"
 * - "1 hour ago"
 * - "Oct 30, 10:30 AM" (> 24 hours)
 */
export const useFormatTimestamp = () => {
  return useCallback((date: Date | undefined): string => {
    if (!date) {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Just now (< 1 minute)
    if (diffMinutes < 1) {
      return 'agora mesmo';
    }

    // Minutes ago (< 60 minutes)
    if (diffMinutes < 60) {
      return `há ${diffMinutes} minuto${diffMinutes === 1 ? '' : 's'}`;
    }

    // Hours ago (< 24 hours)
    if (diffHours < 24) {
      return `há ${diffHours} hora${diffHours === 1 ? '' : 's'}`;
    }

    // Days ago (< 7 days)
    if (diffDays < 7) {
      return `há ${diffDays} dia${diffDays === 1 ? '' : 's'}`;
    }

    // Absolute time for older messages
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }, []);
};
