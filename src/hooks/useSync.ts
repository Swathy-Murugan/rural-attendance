import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";
import { toast } from "sonner";

export const useSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Syncing data...");
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info("Working offline. Data will sync when connected.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check unsynced count
  const checkUnsyncedCount = useCallback(async () => {
    try {
      const records = await db.getUnsyncedRecords();
      setUnsyncedCount(records.length);
    } catch {
      // Silently handle error - non-critical operation
    }
  }, []);

  useEffect(() => {
    checkUnsyncedCount();
    // Check every 30 seconds
    const interval = setInterval(checkUnsyncedCount, 30000);
    return () => clearInterval(interval);
  }, [checkUnsyncedCount]);

  // Sync data to server
  const syncData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      const unsyncedRecords = await db.getUnsyncedRecords();

      if (unsyncedRecords.length === 0) {
        return;
      }

      // TODO: Replace with actual API call
      // Simulating API call with delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mark records as synced
      const ids = unsyncedRecords.map(r => r.id!).filter(id => id !== undefined);
      await db.markAsSynced(ids);
      
      setLastSyncTime(new Date());
      setUnsyncedCount(0);
      
      toast.success(`${unsyncedRecords.length} records synced successfully`);
    } catch {
      toast.error("Failed to sync data. Will retry automatically.");
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && unsyncedCount > 0) {
      syncData();
    }
  }, [isOnline, unsyncedCount, syncData]);

  return {
    isOnline,
    isSyncing,
    unsyncedCount,
    lastSyncTime,
    syncData,
    checkUnsyncedCount
  };
};
