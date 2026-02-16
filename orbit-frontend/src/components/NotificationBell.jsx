import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from './icons';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../context/AuthContext';
import { resolveUserRole } from '../utils/roleUtils';
import approvalRequestService from '../services/approvalRequestService';
import { fetchWithCache, getCachedData, setCachedData } from '../utils/dataCache';

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userRole = resolveUserRole(user);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const cacheKey = `${user?.id || 'anonymous'}_${userRole || 'unknown'}`;
  const cacheTTL = 60 * 1000;

  const normalizeUnread = useCallback(
    (rows = []) => (Array.isArray(rows) ? rows.filter((row) => row?.is_read !== true) : []),
    []
  );

  const formatRelativeTime = useCallback((value) => {
    if (!value) return 'just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'just now';

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;

    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }, []);

  const loadNotifications = useCallback(async (options = {}) => {
    const { forceRefresh = false, silent = false } = options;
    const token = localStorage.getItem('authToken') || '';
    if (!token || !user?.id) {
      setNotifications([]);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchWithCache(
        'notifications',
        cacheKey,
        () => approvalRequestService.getUserNotifications({ role: userRole }, token),
        cacheTTL,
        forceRefresh
      );
      setNotifications(normalizeUnread(data));
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [cacheKey, normalizeUnread, user?.id, userRole]);

  useEffect(() => {
    const cached = getCachedData('notifications', cacheKey);
    if (cached) {
      setNotifications(normalizeUnread(cached));
    }
    loadNotifications({ forceRefresh: false, silent: true });
  }, [cacheKey, loadNotifications, normalizeUnread]);

  useEffect(() => {
    if (!open) return;
    loadNotifications({ forceRefresh: true, silent: false });
  }, [open, loadNotifications]);

  const handleNotificationClick = useCallback(
    async (notif) => {
      const token = localStorage.getItem('authToken') || '';
      const notificationId = notif?.notification_id || notif?.id;
      const requestId = notif?.request_id || notif?.requestId;

      const nextNotifications = notifications.filter(
        (item) => (item?.notification_id || item?.id) !== notificationId
      );
      setNotifications(nextNotifications);
      setCachedData('notifications', cacheKey, nextNotifications, cacheTTL);

      try {
        if (notificationId && token) {
          await approvalRequestService.markNotificationRead(notificationId, token);
        }
      } catch (err) {
        // Keep optimistic UI behavior; notification is already hidden locally.
      }

      setOpen(false);

      if (!requestId) return;
      const targetTab = userRole === 'requestor' ? 'history' : 'requests';
      navigate(`/approval?tab=${targetTab}&requestId=${encodeURIComponent(requestId)}`);
    },
    [cacheKey, navigate, notifications, userRole]
  );

  const visibleNotifications = notifications;
  const hasUnread = visibleNotifications.some((notif) => notif?.is_read === false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-10 w-10 rounded-full text-white hover:bg-white/10">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-900" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-slate-800 border-slate-700 shadow-xl" align="end">
        <Card className="border-0 bg-transparent text-white">
          <CardHeader className="py-3 px-4 border-b border-slate-700/50">
            <CardTitle className="text-sm font-semibold text-white">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading notifications...</div>
            ) : error ? (
              <div className="p-8 text-center text-sm text-red-300">{error}</div>
            ) : visibleNotifications.length > 0 ? (
              <div className="flex flex-col divide-y divide-slate-700/50">
                {visibleNotifications.map((notif) => (
                  <button
                    key={notif.notification_id || notif.id}
                    type="button"
                    onClick={() => handleNotificationClick(notif)}
                    className="w-full text-left p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="text-sm font-medium text-white mb-1">{notif.title || 'Notification'}</div>
                    <div className="text-xs text-slate-400 mb-2 leading-relaxed">{notif.message || '—'}</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {formatRelativeTime(notif.created_at || notif.sent_date || notif.updated_at)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">
                No new notifications
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
