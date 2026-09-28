import { Folder, LogEntry, ThemeMode } from '../types';
import { DEFAULT_FOLDERS, DEFAULT_LOGS } from '../data/defaultLogs';

const STORAGE_KEYS = {
  FOLDERS: 'simple_log_folders_v2',
  LOGS: 'simple_log_items_v2',
  THEME: 'simple_log_theme_v2',
  OFFLINE_BACKUP_LOGS: 'simple_log_offline_backup_logs_v1',
  OFFLINE_BACKUP_FOLDERS: 'simple_log_offline_backup_folders_v1',
};

// Backup offline data before any cloud overwrite
export function backupOfflineData(logs: LogEntry[], folders: Folder[]) {
  try {
    if (logs && logs.length > 0) {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_BACKUP_LOGS, JSON.stringify(logs));
    }
    if (folders && folders.length > 0) {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_BACKUP_FOLDERS, JSON.stringify(folders));
    }
  } catch (e) {
    console.error('Failed to backup offline data:', e);
  }
}

export function getOfflineBackupData(): { logs: LogEntry[]; folders: Folder[] } {
  try {
    const rawLogs = localStorage.getItem(STORAGE_KEYS.OFFLINE_BACKUP_LOGS);
    const rawFolders = localStorage.getItem(STORAGE_KEYS.OFFLINE_BACKUP_FOLDERS);
    const logs = rawLogs ? JSON.parse(rawLogs) : [];
    const folders = rawFolders ? JSON.parse(rawFolders) : [];
    return {
      logs: Array.isArray(logs) ? logs : [],
      folders: Array.isArray(folders) ? folders : [],
    };
  } catch {
    return { logs: [], folders: [] };
  }
}

export function getStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME);
    if (raw === 'asphalt' || raw === 'grayblue' || raw === 'paper' || raw === 'milk') {
      return raw;
    }
    return 'asphalt';
  } catch {
    return 'asphalt';
  }
}

export function saveStoredTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}

export function getStoredFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(DEFAULT_FOLDERS));
      return DEFAULT_FOLDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FOLDERS;
  } catch {
    return DEFAULT_FOLDERS;
  }
}

export function saveStoredFolders(folders: Folder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  } catch (e) {
    console.error('Failed to save folders:', e);
  }
}

export function getStoredLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(DEFAULT_LOGS));
      return DEFAULT_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_LOGS;
  } catch {
    return DEFAULT_LOGS;
  }
}

export function saveStoredLogs(logs: LogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save logs:', e);
  }
}
