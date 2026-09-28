import React, { useState, useEffect, useRef } from 'react';
import { Folder, LogEntry, HighlightColor, FontSizeOption, ThemeMode } from './types';
import {
  getStoredFolders,
  saveStoredFolders,
  getStoredLogs,
  saveStoredLogs,
  getStoredTheme,
  saveStoredTheme,
} from './utils/storage';
import { FormattedLog, FONT_SIZE_CLASSES } from './components/FormattedLog';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  testConnection,
  saveLogToCloud,
  deleteLogFromCloud,
  deleteFolderFromCloud,
  syncFoldersToCloud,
  subscribeToUserFolders,
  subscribeToUserLogs,
} from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Folder as FolderIcon,
  Copy,
  Check,
  X,
  FileText,
  FolderPlus,
  ArrowLeft,
  Star,
  ArrowDownUp,
  Highlighter,
  Type,
  Bold,
  Italic,
  Code,
  Quote,
  Eye,
  Settings,
  Palette,
  Cloud,
  CloudCheck,
  LogIn,
  LogOut,
} from 'lucide-react';

// 업로드해주신 이미지의 정확한 4가지 색상:
// 1. ASPHALT (#302f2c)
// 2. GRAY BLUE (#2b323f)
// 3. PAPER (#efede3)
// 4. MILK (#FCFBF7 / #EC5E27 액센트)
interface ThemeConfig {
  id: ThemeMode;
  name: string;
  colorCode: string;
  subtitle: string;
  primary: string; // 버튼 및 핵심 포인트 색
  primaryText: string;
  bgApp: string; // 전체 앱 배경
  bgSurface: string; // 카드, 리스트, 헤더 배경
  bgInput: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  activeItemBg: string;
  isDark: boolean;
}

const THEMES: Record<ThemeMode, ThemeConfig> = {
  // 1. ASPHALT (#302f2c) - 웜 차콜 다크 모드
  asphalt: {
    id: 'asphalt',
    name: 'ASPHALT',
    colorCode: '#302f2c',
    subtitle: '묵직하고 따뜻한 아스팔트 차콜 다크',
    primary: '#efede3',
    primaryText: '#302f2c',
    bgApp: '#232220',
    bgSurface: '#302f2c',
    bgInput: '#3a3935',
    border: '#45433f',
    borderLight: '#393834',
    textPrimary: '#efede3',
    textSecondary: '#d8d4c7',
    textMuted: '#9e998c',
    activeItemBg: 'rgba(239, 237, 227, 0.12)',
    isDark: true,
  },
  // 2. GRAY BLUE (#2b323f) - 차분한 네이비 그레이 다크 모드
  grayblue: {
    id: 'grayblue',
    name: 'GRAY BLUE',
    colorCode: '#2b323f',
    subtitle: '세련되고 깊은 그레이 블루 딥 다크',
    primary: '#9EADC8',
    primaryText: '#1f2530',
    bgApp: '#202630',
    bgSurface: '#2b323f',
    bgInput: '#353e4d',
    border: '#414b5c',
    borderLight: '#353e4c',
    textPrimary: '#f0f3f8',
    textSecondary: '#ccd6e5',
    textMuted: '#8a97ab',
    activeItemBg: 'rgba(158, 173, 200, 0.16)',
    isDark: true,
  },
  // 3. PAPER (#efede3) - 부드러운 빈티지 페이퍼 라이트 모드
  paper: {
    id: 'paper',
    name: 'PAPER',
    colorCode: '#efede3',
    subtitle: '눈이 가장 편안한 은은한 페이퍼 톤',
    primary: '#302f2c',
    primaryText: '#efede3',
    bgApp: '#e5e2d6',
    bgSurface: '#efede3',
    bgInput: '#f7f6f0',
    border: '#d6d2c4',
    borderLight: '#dfdcce',
    textPrimary: '#302f2c',
    textSecondary: '#5a5752',
    textMuted: '#8c887f',
    activeItemBg: 'rgba(48, 47, 44, 0.08)',
    isDark: false,
  },
  // 4. MILK (#FCFBF7 & #EC5E27) - 순백 밀크 크림 라이트 모드
  milk: {
    id: 'milk',
    name: 'MILK',
    colorCode: '#FCFBF7',
    subtitle: '화사하고 깨끗한 밀크 크림 화이트',
    primary: '#2b323f',
    primaryText: '#FCFBF7',
    bgApp: '#F5F3ED',
    bgSurface: '#FCFBF7',
    bgInput: '#FFFFFF',
    border: '#E8E5DD',
    borderLight: '#F0ECE4',
    textPrimary: '#2B323F',
    textSecondary: '#545C6C',
    textMuted: '#8F97A6',
    activeItemBg: 'rgba(43, 50, 63, 0.07)',
    isDark: false,
  },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const [folders, setFolders] = useState<Folder[]>(getStoredFolders);
  const [logs, setLogs] = useState<LogEntry[]>(getStoredLogs);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(getStoredTheme);

  // Connection test on mount
  useEffect(() => {
    testConnection();
  }, []);

  // Firebase Auth Listener & real-time Firestore sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // When logged in, subscribe to user's cloud folders & logs in Firestore
  useEffect(() => {
    if (!currentUser) return;

    setIsCloudSyncing(true);

    const unsubFolders = subscribeToUserFolders(
      currentUser.uid,
      (cloudFolders) => {
        if (cloudFolders.length > 0) {
          setFolders(cloudFolders);
        } else {
          // If user has no cloud folders yet, seed with current local folders
          syncFoldersToCloud(currentUser.uid, folders);
        }
      },
      (err) => console.warn('Cloud folders listener:', err)
    );

    const unsubLogs = subscribeToUserLogs(
      currentUser.uid,
      (cloudLogs) => {
        setIsCloudSyncing(false);
        if (cloudLogs.length > 0) {
          setLogs(cloudLogs);
        } else if (logs.length > 0) {
          // Seed initial local logs to cloud
          logs.forEach((l) => saveLogToCloud(currentUser.uid, l));
        }
      },
      (err) => {
        setIsCloudSyncing(false);
        console.warn('Cloud logs listener:', err);
      }
    );

    return () => {
      unsubFolders();
      unsubLogs();
    };
  }, [currentUser?.uid]);

  // 'all' | 'favorites' | folderId
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(() => logs[0]?.id || null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Mobile detail view switch
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // Log Edit/Add Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [inputTitle, setInputTitle] = useState('');
  const [inputFolderId, setInputFolderId] = useState('');
  const [inputContent, setInputContent] = useState('');
  const [inputIsFavorite, setInputIsFavorite] = useState(false);
  const [inputFontSize, setInputFontSize] = useState<FontSizeOption>('base');
  const [editorActiveTab, setEditorActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Folder Management Modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Settings (Theme) Modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Copy feedback
  const [copied, setCopied] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    saveStoredFolders(folders);
  }, [folders]);

  useEffect(() => {
    saveStoredLogs(logs);
  }, [logs]);

  useEffect(() => {
    saveStoredTheme(currentTheme);
  }, [currentTheme]);

  const themeConfig = THEMES[currentTheme] || THEMES.asphalt;
  const isDark = themeConfig.isDark;

  // Selected Log
  const activeLog = logs.find((l) => l.id === selectedLogId) || logs[0] || null;

  // Toggle favorite for a log
  const handleToggleFavorite = (logId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLogs((prev) =>
      prev.map((log) => {
        if (log.id === logId) {
          const updated = { ...log, isFavorite: !log.isFavorite };
          if (currentUser) {
            saveLogToCloud(currentUser.uid, updated);
          }
          return updated;
        }
        return log;
      })
    );
  };

  // Filter logs by folder / favorites & search query
  const filteredLogs = logs.filter((log) => {
    let matchCategory = true;
    if (selectedFolderId === 'favorites') {
      matchCategory = !!log.isFavorite;
    } else if (selectedFolderId !== 'all') {
      matchCategory = log.folderId === selectedFolderId;
    }

    const matchQuery =
      searchQuery.trim() === '' ||
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.content.toLowerCase().includes(searchQuery.toLowerCase());

    return matchCategory && matchQuery;
  });

  // Sort logs by createdAt (newest vs oldest)
  const displayedLogs = [...filteredLogs].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  // Open Log Editor
  const handleOpenNewLog = () => {
    setEditingLogId(null);
    setInputTitle('');
    setInputFolderId(
      selectedFolderId !== 'all' && selectedFolderId !== 'favorites'
        ? selectedFolderId
        : folders[0]?.id || ''
    );
    setInputContent('');
    setInputIsFavorite(selectedFolderId === 'favorites');
    setInputFontSize('base');
    setEditorActiveTab('write');
    setIsEditorOpen(true);
  };

  const handleOpenEditLog = (log: LogEntry) => {
    setEditingLogId(log.id);
    setInputTitle(log.title);
    setInputFolderId(log.folderId);
    setInputContent(log.content);
    setInputIsFavorite(!!log.isFavorite);
    const validSize: FontSizeOption =
      log.fontSize === 'xs' || log.fontSize === 'sm' || log.fontSize === 'base' || log.fontSize === 'lg'
        ? log.fontSize
        : 'base';
    setInputFontSize(validSize);
    setEditorActiveTab('write');
    setIsEditorOpen(true);
  };

  // Textarea toolbar formatting helpers
  const handleInsertHighlightTag = (color: HighlightColor) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = inputContent.substring(start, end);

    let prefix = '==';
    if (color === 'green') prefix = '==g:';
    else if (color === 'rose') prefix = '==r:';
    else if (color === 'blue') prefix = '==b:';
    const suffix = '==';

    let replacement: string;
    let newCursorPos: number;

    if (selected) {
      replacement = `${prefix}${selected}${suffix}`;
      newCursorPos = start + replacement.length;
    } else {
      replacement = `${prefix}형광펜 텍스트${suffix}`;
      newCursorPos = start + prefix.length + '형광펜 텍스트'.length;
    }

    const nextContent = inputContent.substring(0, start) + replacement + inputContent.substring(end);
    setInputContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selected ? start : start + prefix.length,
        selected ? newCursorPos : start + prefix.length + '형광펜 텍스트'.length
      );
    }, 10);
  };

  const handleInsertBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = inputContent.substring(start, end);

    const replacement = selected ? `**${selected}**` : '**굵은 글씨**';
    const nextContent = inputContent.substring(0, start) + replacement + inputContent.substring(end);
    setInputContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start + 2, end + 2);
      } else {
        textarea.setSelectionRange(start + 2, start + 2 + '굵은 글씨'.length);
      }
    }, 10);
  };

  const handleInsertItalic = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = inputContent.substring(start, end);

    const replacement = selected ? `*${selected}*` : '*기울임 이탤릭체*';
    const nextContent = inputContent.substring(0, start) + replacement + inputContent.substring(end);
    setInputContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start + 1, end + 1);
      } else {
        textarea.setSelectionRange(start + 1, start + 1 + '기울임 이탤릭체'.length);
      }
    }, 10);
  };

  const handleInsertQuote = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = inputContent.substring(start, end);

    const replacement = selected
      ? selected
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')
      : '> 인용문 내용';
    const nextContent = inputContent.substring(0, start) + replacement + inputContent.substring(end);
    setInputContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    }, 10);
  };

  const handleInsertCodeBlock = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = inputContent.substring(start, end);

    const replacement = selected
      ? `\`\`\`\n${selected}\n\`\`\``
      : '```\n😺 캐릭터 대화 내용 또는 코드블럭\n```';
    const nextContent = inputContent.substring(0, start) + replacement + inputContent.substring(end);
    setInputContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 4, start + 4 + (selected ? selected.length : 21));
    }, 10);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim() || !inputContent.trim()) return;

    if (editingLogId) {
      // Update
      const existing = logs.find((l) => l.id === editingLogId);
      const updatedLog: LogEntry = {
        id: editingLogId,
        title: inputTitle.trim(),
        folderId: inputFolderId || folders[0]?.id || 'default',
        content: inputContent.trim(),
        isFavorite: inputIsFavorite,
        fontSize: inputFontSize,
        highlights: existing?.highlights || [],
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = logs.map((l) => (l.id === editingLogId ? updatedLog : l));
      setLogs(updated);

      if (currentUser) {
        saveLogToCloud(currentUser.uid, updatedLog);
      }
    } else {
      // Create
      const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        title: inputTitle.trim(),
        folderId: inputFolderId || folders[0]?.id || 'default',
        content: inputContent.trim(),
        isFavorite: inputIsFavorite,
        fontSize: inputFontSize,
        highlights: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setLogs([newLog, ...logs]);
      setSelectedLogId(newLog.id);

      if (currentUser) {
        saveLogToCloud(currentUser.uid, newLog);
      }
    }

    setIsEditorOpen(false);
  };

  const handleDeleteLog = (id: string) => {
    if (!confirm('이 로그를 삭제하시겠습니까?')) return;
    const remaining = logs.filter((l) => l.id !== id);
    setLogs(remaining);
    if (selectedLogId === id) {
      setSelectedLogId(remaining[0]?.id || null);
      setIsMobileDetailOpen(false);
    }
    if (currentUser) {
      deleteLogFromCloud(currentUser.uid, id);
    }
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add Folder
  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
    };
    const nextFolders = [...folders, newFolder];
    setFolders(nextFolders);
    setNewFolderName('');
    if (currentUser) {
      syncFoldersToCloud(currentUser.uid, nextFolders);
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    if (folders.length <= 1) {
      alert('최소 1개의 폴더는 유지되어야 합니다.');
      return;
    }
    if (!confirm('이 폴더를 삭제하시겠습니까? 해당 폴더의 로그는 기본 폴더로 이동합니다.')) return;
    const fallback = folders.find((f) => f.id !== folderId);
    if (!fallback) return;

    const nextLogs = logs.map((l) => (l.folderId === folderId ? { ...l, folderId: fallback.id } : l));
    const nextFolders = folders.filter((f) => f.id !== folderId);
    setLogs(nextLogs);
    setFolders(nextFolders);
    if (selectedFolderId === folderId) {
      setSelectedFolderId('all');
    }
    if (currentUser) {
      deleteFolderFromCloud(currentUser.uid, folderId);
      nextLogs.forEach((l) => saveLogToCloud(currentUser.uid, l));
    }
  };

  const autoExtractTitleFromContent = (text: string) => {
    if (inputTitle) return;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 5)) {
      const match = line.match(/\*{0,2}(?:웹툰명|제목|작품명|주제)\s*:\s*([^*\n\r]+)\*{0,2}/i);
      if (match) {
        setInputTitle(match[1].trim());
        return;
      }
    }
    if (lines[0]) {
      setInputTitle(lines[0].replace(/[#*`=~]/g, '').slice(0, 30));
    }
  };

  const favoritesCount = logs.filter((l) => l.isFavorite).length;

  const FONT_SIZE_OPTIONS: { key: FontSizeOption; label: string }[] = [
    { key: 'xs', label: '아주 작게' },
    { key: 'sm', label: '작게' },
    { key: 'base', label: '보통' },
    { key: 'lg', label: '크게' },
  ];

  return (
    <div
      style={{
        backgroundColor: themeConfig.bgApp,
        color: themeConfig.textPrimary,
      }}
      className="flex flex-col h-screen w-screen transition-colors duration-150 select-text"
    >
      {/* Top Header */}
      <header
        style={{
          backgroundColor: themeConfig.bgSurface,
          borderColor: themeConfig.border,
        }}
        className="h-14 border-b px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: themeConfig.primary,
              color: themeConfig.primaryText,
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs tracking-wider shadow-xs"
          >
            AI
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                style={{ color: themeConfig.textPrimary }}
                className="font-bold text-sm tracking-tight"
              >
                AI 채팅 로그 보관소
              </h1>
              <span
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: themeConfig.textMuted,
                  borderColor: themeConfig.borderLight,
                }}
                className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium border hidden sm:inline"
              >
                {themeConfig.name}
              </span>
            </div>
            <p
              style={{ color: themeConfig.textMuted }}
              className="text-[11px] hidden sm:block"
            >
              소중한 AI 답변과 대화를 깔끔하게 저장하고 모아보기
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cloud Sync & Firebase Auth Status */}
          {currentUser ? (
            <div
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: themeConfig.border,
              }}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs"
            >
              <div className="flex items-center gap-1.5" title="Firebase 클라우드 실시간 동기화 활성">
                <Cloud className={`w-3.5 h-3.5 text-emerald-400 ${isCloudSyncing ? 'animate-pulse' : ''}`} />
                <span className="hidden lg:inline text-[11px] font-medium" style={{ color: themeConfig.textSecondary }}>
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => signOutUser()}
                style={{ color: themeConfig.textMuted }}
                className="hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                title="로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                color: themeConfig.textPrimary,
                borderColor: themeConfig.border,
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer hover:opacity-85"
              title="Google 계정으로 로그인하여 로그와 폴더를 무료 Firebase 클라우드에 영구 백업"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">구글 로그인 (클라우드 백업)</span>
              <span className="sm:hidden">로그인</span>
            </button>
          )}

          {/* Settings (Theme Selector) Button */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              color: themeConfig.textPrimary,
              borderColor: themeConfig.border,
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer hover:opacity-85"
            title="색상 테마 변경"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">테마 설정</span>
          </button>

          {/* Folder Management Button */}
          <button
            onClick={() => setIsFolderModalOpen(true)}
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              color: themeConfig.textSecondary,
              borderColor: themeConfig.border,
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer hover:opacity-85"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">폴더 관리</span>
          </button>

          {/* New Log Button */}
          <button
            onClick={handleOpenNewLog}
            style={{
              backgroundColor: themeConfig.primary,
              color: themeConfig.primaryText,
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-opacity hover:opacity-90 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>새 로그 저장</span>
          </button>
        </div>
      </header>

      {/* Main 2-Column Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Folders Filter + Search + Log List */}
        <section
          style={{
            backgroundColor: themeConfig.bgSurface,
            borderColor: themeConfig.border,
          }}
          className={`w-full md:w-80 lg:w-96 border-r flex flex-col h-full shrink-0 ${
            isMobileDetailOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Box */}
          <div
            style={{ borderColor: themeConfig.borderLight }}
            className="p-3 border-b space-y-2.5"
          >
            <div className="relative">
              <Search
                style={{ color: themeConfig.textMuted }}
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목으로 찾기..."
                style={{
                  backgroundColor: themeConfig.bgInput,
                  borderColor: themeConfig.border,
                  color: themeConfig.textPrimary,
                }}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs placeholder:opacity-50 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ color: themeConfig.textMuted }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:opacity-80 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Folder & Favorites Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
              {/* All */}
              <button
                onClick={() => setSelectedFolderId('all')}
                style={{
                  backgroundColor: selectedFolderId === 'all' ? themeConfig.primary : themeConfig.bgInput,
                  color: selectedFolderId === 'all' ? themeConfig.primaryText : themeConfig.textSecondary,
                  borderColor: themeConfig.border,
                }}
                className="px-2.5 py-1 rounded-md whitespace-nowrap transition-colors cursor-pointer border font-semibold"
              >
                전체 ({logs.length})
              </button>

              {/* Favorites (즐겨찾기 전용 탭) */}
              <button
                onClick={() => setSelectedFolderId('favorites')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedFolderId === 'favorites'
                    ? 'bg-amber-600 text-white font-medium border-amber-600 shadow-xs'
                    : isDark
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100/80'
                }`}
              >
                <Star
                  className={`w-3 h-3 ${
                    selectedFolderId === 'favorites'
                      ? 'fill-white text-white'
                      : 'fill-amber-400 text-amber-400'
                  }`}
                />
                <span>즐겨찾기 ({favoritesCount})</span>
              </button>

              {/* Folders */}
              {folders.map((folder) => {
                const count = logs.filter((l) => l.folderId === folder.id).length;
                const isSelected = selectedFolderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    style={{
                      backgroundColor: isSelected ? themeConfig.primary : themeConfig.bgInput,
                      color: isSelected ? themeConfig.primaryText : themeConfig.textSecondary,
                      borderColor: themeConfig.border,
                    }}
                    className="px-2.5 py-1 rounded-md whitespace-nowrap transition-colors cursor-pointer border font-medium"
                  >
                    {folder.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* List Controls: Count and Sort Toggle */}
            <div
              style={{ color: themeConfig.textMuted }}
              className="flex items-center justify-between pt-1 px-0.5 text-xs"
            >
              <span className="text-[11px]">
                총 <strong style={{ color: themeConfig.textPrimary }} className="font-semibold">{displayedLogs.length}</strong>개
              </span>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                style={{ color: themeConfig.textSecondary }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium hover:opacity-80 transition-colors cursor-pointer"
                title="정렬 기준 변경"
              >
                <ArrowDownUp className="w-3 h-3 opacity-70" />
                <span>{sortOrder === 'newest' ? '최신순' : '오래된순'}</span>
              </button>
            </div>
          </div>

          {/* Log List */}
          <div
            style={{ borderColor: themeConfig.borderLight }}
            className="flex-1 overflow-y-auto divide-y"
          >
            {displayedLogs.length === 0 ? (
              <div
                style={{ color: themeConfig.textMuted }}
                className="p-8 text-center text-xs space-y-2"
              >
                <FileText className="w-8 h-8 opacity-40 mx-auto" />
                <div>
                  {selectedFolderId === 'favorites'
                    ? '즐겨찾기한 로그가 없습니다.'
                    : '보관된 로그가 없습니다.'}
                </div>
                {selectedFolderId === 'favorites' ? (
                  <p className="text-[11px] opacity-75">
                    중요한 로그의 별표(★)를 눌러 즐겨찾기에 등록해보세요.
                  </p>
                ) : (
                  searchQuery && <p className="text-[11px] opacity-75">검색어를 다시 확인해보세요.</p>
                )}
              </div>
            ) : (
              displayedLogs.map((log) => {
                const isSelected = selectedLogId === log.id;
                const folder = folders.find((f) => f.id === log.folderId);
                const hasHighlights = (log.highlights?.length || 0) > 0 || log.content.includes('==');
                const sizeLabel =
                  log.fontSize && log.fontSize !== 'base'
                    ? FONT_SIZE_CLASSES[log.fontSize]?.label
                    : null;

                return (
                  <div
                    key={log.id}
                    onClick={() => {
                      setSelectedLogId(log.id);
                      setIsMobileDetailOpen(true);
                    }}
                    style={{
                      backgroundColor: isSelected ? themeConfig.activeItemBg : 'transparent',
                      borderLeftColor: isSelected ? themeConfig.primary : 'transparent',
                      borderTopColor: themeConfig.borderLight,
                      borderRightColor: themeConfig.borderLight,
                      borderBottomColor: themeConfig.borderLight,
                    }}
                    className={`p-3.5 cursor-pointer transition-colors text-left select-none relative group border-l-3 hover:opacity-90 ${
                      !isSelected && (isDark ? 'hover:bg-white/5' : 'hover:bg-black/5')
                    }`}
                  >
                    <div
                      style={{ color: themeConfig.textMuted }}
                      className="flex items-center justify-between text-[11px] mb-1"
                    >
                      <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <span
                          style={{ color: isSelected ? themeConfig.textPrimary : themeConfig.textSecondary }}
                          className="font-semibold truncate"
                        >
                          {folder?.name || '기본 폴더'}
                        </span>
                        {hasHighlights && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-amber-400/20 text-amber-300 text-[10px] rounded font-semibold shrink-0"
                            title="형광펜 마킹 포함"
                          >
                            <Highlighter className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {sizeLabel && (
                          <span
                            style={{
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                              color: themeConfig.textMuted,
                            }}
                            className="text-[10px] px-1 py-0.2 rounded font-medium shrink-0"
                          >
                            {sizeLabel}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span>
                          {new Date(log.createdAt).toLocaleDateString('ko-KR', {
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </span>
                        {/* Star icon button on list item */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(log.id, e)}
                          className="p-0.5 hover:text-amber-400 transition-colors cursor-pointer"
                          title={log.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              log.isFavorite
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-stone-400/40 hover:text-amber-400'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <h2
                      style={{ color: themeConfig.textPrimary }}
                      className="text-sm font-semibold line-clamp-1 mb-1 tracking-tight flex items-center gap-1.5"
                    >
                      {log.isFavorite && (
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0 inline" />
                      )}
                      <span>{log.title}</span>
                    </h2>

                    <p
                      style={{ color: themeConfig.textMuted }}
                      className="text-xs line-clamp-2 leading-relaxed opacity-90"
                    >
                      {log.content.replace(/[#*`_~|=]/g, '').trim()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Preview Area (미리보기) */}
        <main
          style={{ backgroundColor: themeConfig.bgApp }}
          className={`flex-1 flex flex-col h-full overflow-hidden ${
            !isMobileDetailOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeLog ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              {/* Preview Header */}
              <div
                style={{
                  backgroundColor: themeConfig.bgSurface,
                  borderColor: themeConfig.border,
                }}
                className="px-5 py-3 border-b flex items-center justify-between gap-3 shrink-0"
              >
                <div className="flex items-center gap-2 truncate">
                  <button
                    onClick={() => setIsMobileDetailOpen(false)}
                    style={{ color: themeConfig.textSecondary }}
                    className="md:hidden p-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span style={{ color: themeConfig.textSecondary }}>
                        {folders.find((f) => f.id === activeLog.folderId)?.name || '보관함'}
                      </span>
                      {activeLog.fontSize && activeLog.fontSize !== 'base' && (
                        <span style={{ color: themeConfig.textMuted }} className="text-[10px] font-normal">
                          · {FONT_SIZE_CLASSES[activeLog.fontSize]?.label}
                        </span>
                      )}
                    </div>
                    <h2
                      style={{ color: themeConfig.textPrimary }}
                      className="text-base font-bold truncate flex items-center gap-2"
                    >
                      <span>{activeLog.title}</span>
                    </h2>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Star Toggle in Detail Preview */}
                  <button
                    onClick={() => handleToggleFavorite(activeLog.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer border ${
                      activeLog.isFavorite
                        ? isDark
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-amber-50 border-amber-300 text-amber-700'
                        : isDark
                        ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
                        : 'bg-black/5 border-black/10 text-stone-700 hover:bg-black/10'
                    }`}
                    title={activeLog.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        activeLog.isFavorite
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-400'
                      }`}
                    />
                    <span>{activeLog.isFavorite ? '즐겨찾기됨' : '즐겨찾기'}</span>
                  </button>

                  <button
                    onClick={() => handleCopyContent(activeLog.content)}
                    style={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                      color: themeConfig.textPrimary,
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 hover:opacity-80 text-xs font-medium rounded-md transition-colors cursor-pointer"
                    title="본문 복사"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '복사됨' : '복사'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditLog(activeLog)}
                    style={{
                      backgroundColor: themeConfig.activeItemBg,
                      color: themeConfig.textPrimary,
                      borderColor: themeConfig.border,
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-opacity hover:opacity-85 cursor-pointer"
                    title="수정 화면 열기 (형광펜 마킹 및 글씨 크기 조정)"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>수정 / 마킹</span>
                  </button>

                  <button
                    onClick={() => handleDeleteLog(activeLog.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Body (미리보기 본문) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div
                  style={{
                    backgroundColor: themeConfig.bgSurface,
                    borderColor: themeConfig.border,
                  }}
                  className="max-w-3xl mx-auto border rounded-xl p-6 sm:p-8 shadow-xs"
                >
                  <FormattedLog
                    content={activeLog.content}
                    fontSize={activeLog.fontSize || 'base'}
                    theme={currentTheme}
                    highlights={activeLog.highlights || []}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{ color: themeConfig.textMuted }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3"
            >
              <FileText className="w-10 h-10 opacity-40" />
              <div className="text-sm font-medium" style={{ color: themeConfig.textPrimary }}>
                선택된 로그가 없습니다.
              </div>
              <p className="text-xs">
                목록에서 읽고 싶은 대화 로그를 선택하거나 '새 로그 저장'을 눌러 추가하세요.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Settings (Theme Selector: ASPHALT, GRAY BLUE, PAPER, MILK) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            style={{
              backgroundColor: themeConfig.bgSurface,
              borderColor: themeConfig.border,
              color: themeConfig.textPrimary,
            }}
            className="w-full max-w-md border rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div
              style={{ borderColor: themeConfig.border }}
              className="flex items-center justify-between px-5 py-3.5 border-b"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <h3 className="font-bold text-sm">테마 색상 선택</h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ color: themeConfig.textMuted }}
                className="hover:opacity-80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p style={{ color: themeConfig.textMuted }} className="text-xs leading-relaxed">
                4가지 전용 팔레트 중에서 원하는 분위기의 테마를 선택하세요.
              </p>

              <div className="space-y-2.5 pt-1">
                {(Object.keys(THEMES) as ThemeMode[]).map((tKey) => {
                  const themeObj = THEMES[tKey];
                  const isCurrent = currentTheme === tKey;

                  return (
                    <div
                      key={tKey}
                      onClick={() => setCurrentTheme(tKey)}
                      style={{
                        backgroundColor: isCurrent
                          ? themeObj.activeItemBg
                          : isDark
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(0,0,0,0.02)',
                        borderColor: isCurrent ? themeObj.primary : themeConfig.border,
                      }}
                      className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isCurrent ? 'ring-2' : 'hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Color swatch box */}
                        <div
                          style={{
                            backgroundColor: themeObj.colorCode,
                            borderColor: isCurrent ? themeObj.primary : '#888888',
                          }}
                          className="w-10 h-10 rounded-lg border-2 flex items-center justify-center shrink-0 shadow-xs"
                        >
                          <span
                            style={{
                              color: themeObj.isDark ? '#efede3' : '#302f2c',
                            }}
                            className="font-mono text-[9px] font-bold"
                          >
                            {themeObj.isDark ? 'DARK' : 'LIGHT'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              style={{ color: themeConfig.textPrimary }}
                              className="font-extrabold text-xs tracking-wider"
                            >
                              {themeObj.name}
                            </span>
                            <span
                              style={{
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                color: themeConfig.textMuted,
                              }}
                              className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold"
                            >
                              {themeObj.colorCode}
                            </span>
                          </div>
                          <p
                            style={{ color: themeConfig.textMuted }}
                            className="text-[11px] mt-0.5"
                          >
                            {themeObj.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Selected Radio Indicator */}
                      <div
                        style={{
                          borderColor: isCurrent ? themeObj.primary : themeConfig.border,
                          backgroundColor: isCurrent ? themeObj.primary : 'transparent',
                        }}
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      >
                        {isCurrent && (
                          <div
                            style={{ backgroundColor: themeObj.primaryText }}
                            className="w-2 h-2 rounded-full"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                borderColor: themeConfig.border,
              }}
              className="px-5 py-3 border-t flex justify-end"
            >
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                style={{
                  backgroundColor: themeConfig.primary,
                  color: themeConfig.primaryText,
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New/Edit Log with Highlighting & Font Size */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div
            style={{
              backgroundColor: themeConfig.bgSurface,
              borderColor: themeConfig.border,
              color: themeConfig.textPrimary,
            }}
            className="w-full max-w-2xl border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div
              style={{ borderColor: themeConfig.border }}
              className="flex items-center justify-between px-5 py-3.5 border-b"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-sm">
                  {editingLogId ? '로그 수정' : '새 로그 저장'}
                </h3>
                {/* Write / Live Preview Segmented Switcher */}
                <div
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }}
                  className="flex items-center p-0.5 rounded-lg text-xs"
                >
                  <button
                    type="button"
                    onClick={() => setEditorActiveTab('write')}
                    style={{
                      backgroundColor: editorActiveTab === 'write' ? themeConfig.bgSurface : 'transparent',
                      color: editorActiveTab === 'write' ? themeConfig.textPrimary : themeConfig.textMuted,
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium shadow-2xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>편집</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorActiveTab('preview')}
                    style={{
                      backgroundColor: editorActiveTab === 'preview' ? themeConfig.bgSurface : 'transparent',
                      color: editorActiveTab === 'preview' ? themeConfig.textPrimary : themeConfig.textMuted,
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium shadow-2xs"
                  >
                    <Eye className="w-3 h-3" />
                    <span>미리보기</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                style={{ color: themeConfig.textMuted }}
                className="hover:opacity-80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {/* Folder & Favorite selection */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label
                      style={{ color: themeConfig.textSecondary }}
                      className="block text-xs font-semibold mb-1"
                    >
                      보관 폴더
                    </label>
                    <select
                      value={inputFolderId}
                      onChange={(e) => setInputFolderId(e.target.value)}
                      style={{
                        backgroundColor: themeConfig.bgInput,
                        borderColor: themeConfig.border,
                        color: themeConfig.textPrimary,
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none"
                    >
                      {folders.map((f) => (
                        <option
                          key={f.id}
                          value={f.id}
                          style={{
                            backgroundColor: themeConfig.bgSurface,
                            color: themeConfig.textPrimary,
                          }}
                        >
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Favorite toggle in modal */}
                  <div className="sm:pt-5">
                    <button
                      type="button"
                      onClick={() => setInputIsFavorite(!inputIsFavorite)}
                      className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        inputIsFavorite
                          ? isDark
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-amber-50 border-amber-300 text-amber-700'
                          : isDark
                          ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
                          : 'bg-black/5 border-black/10 text-stone-700 hover:bg-black/10'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          inputIsFavorite
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-400'
                        }`}
                      />
                      <span>{inputIsFavorite ? '즐겨찾기 설정됨' : '즐겨찾기 추가'}</span>
                    </button>
                  </div>
                </div>

                {/* Title (제목넣기) */}
                <div>
                  <label
                    style={{ color: themeConfig.textSecondary }}
                    className="block text-xs font-semibold mb-1"
                  >
                    제목 넣기 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    placeholder="예: 북부 대공가의 잃어버린 막내딸 - 48화 독자 반응"
                    style={{
                      backgroundColor: themeConfig.bgInput,
                      borderColor: themeConfig.border,
                      color: themeConfig.textPrimary,
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    required
                  />
                </div>

                {/* Formatting Toolbar: Highlighting & Font Size (아주 작게 / 작게 / 보통 / 크게) */}
                <div
                  style={{
                    backgroundColor: themeConfig.bgInput,
                    borderColor: themeConfig.border,
                  }}
                  className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 border rounded-lg"
                >
                  {/* Left: Highlighting buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      style={{ color: themeConfig.textSecondary }}
                      className="text-[11px] font-semibold flex items-center gap-1 pr-1"
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                      <span>형광펜:</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleInsertHighlightTag('yellow')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/50 rounded text-xs font-medium cursor-pointer transition-colors"
                      title="노랑 형광펜 마킹"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>노랑</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertHighlightTag('green')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-300 border border-emerald-400/50 rounded text-xs font-medium cursor-pointer transition-colors"
                      title="초록 형광펜 마킹"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>초록</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertHighlightTag('rose')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-rose-400/20 hover:bg-rose-400/30 text-rose-300 border border-rose-400/50 rounded text-xs font-medium cursor-pointer transition-colors"
                      title="분홍 형광펜 마킹"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      <span>분홍</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertHighlightTag('blue')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-sky-400/20 hover:bg-sky-400/30 text-sky-300 border border-sky-400/50 rounded text-xs font-medium cursor-pointer transition-colors"
                      title="하늘 형광펜 마킹"
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      <span>하늘</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleInsertBold}
                      style={{
                        backgroundColor: themeConfig.bgSurface,
                        borderColor: themeConfig.border,
                        color: themeConfig.textPrimary,
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs font-medium cursor-pointer transition-colors ml-0.5 hover:opacity-80"
                      title="굵은 글씨 (**텍스트**)"
                    >
                      <Bold className="w-3 h-3" />
                      <span>굵게</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleInsertItalic}
                      style={{
                        backgroundColor: themeConfig.bgSurface,
                        borderColor: themeConfig.border,
                        color: themeConfig.textPrimary,
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs font-serif italic cursor-pointer transition-colors hover:opacity-80"
                      title="기울임 이탤릭체 (*텍스트*)"
                    >
                      <Italic className="w-3 h-3" />
                      <span>이탤릭</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleInsertQuote}
                      style={{
                        backgroundColor: themeConfig.bgSurface,
                        borderColor: themeConfig.border,
                        color: themeConfig.textPrimary,
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs font-medium cursor-pointer transition-colors hover:opacity-80"
                      title="인용구 (> 텍스트)"
                    >
                      <Quote className="w-3 h-3" />
                      <span>인용</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleInsertCodeBlock}
                      style={{
                        backgroundColor: themeConfig.bgSurface,
                        borderColor: themeConfig.border,
                        color: themeConfig.textPrimary,
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs font-mono cursor-pointer transition-colors hover:opacity-80"
                      title="코드블럭/대화상자 (```내용```)"
                    >
                      <Code className="w-3 h-3" />
                      <span>대화상자</span>
                    </button>
                  </div>

                  {/* Right: Font Size Selector (아주 작게, 작게, 보통, 크게) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      style={{ color: themeConfig.textSecondary }}
                      className="text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Type className="w-3.5 h-3.5 opacity-60" />
                      <span>글씨 크기:</span>
                    </span>

                    <div
                      style={{
                        backgroundColor: themeConfig.bgSurface,
                        borderColor: themeConfig.border,
                      }}
                      className="inline-flex items-center border rounded-lg p-0.5 text-xs shadow-2xs"
                    >
                      {FONT_SIZE_OPTIONS.map(({ key, label }) => {
                        const isSelected = inputFontSize === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setInputFontSize(key)}
                            style={{
                              backgroundColor: isSelected ? themeConfig.primary : 'transparent',
                              color: isSelected ? themeConfig.primaryText : themeConfig.textSecondary,
                            }}
                            className="px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer font-semibold"
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Content Area or Preview Tab */}
                {editorActiveTab === 'write' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        style={{ color: themeConfig.textSecondary }}
                        className="block text-xs font-semibold"
                      >
                        AI 채팅 내용 <span className="text-rose-500">*</span>
                      </label>
                      <span style={{ color: themeConfig.textMuted }} className="text-[11px] font-mono">
                        단어나 문장을 드래그 후 상단 형광펜 버튼을 누르면 마킹됩니다.
                      </span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={inputContent}
                      onChange={(e) => {
                        setInputContent(e.target.value);
                        autoExtractTitleFromContent(e.target.value);
                      }}
                      rows={12}
                      placeholder="복사한 AI 대화, 웹툰 반응 댓글 로그를 여기에 붙여넣으세요... 텍스트를 드래그하고 상단 형광펜 버튼(노랑/초록/분홍/하늘)을 누르면 마킹됩니다."
                      style={{
                        backgroundColor: themeConfig.bgInput,
                        borderColor: themeConfig.border,
                        color: themeConfig.textPrimary,
                      }}
                      className="w-full p-3 border rounded-lg text-xs leading-relaxed font-mono resize-y focus:outline-none"
                      required
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: themeConfig.bgSurface,
                      borderColor: themeConfig.border,
                    }}
                    className="border rounded-lg p-5 min-h-[250px] max-h-[380px] overflow-y-auto shadow-2xs"
                  >
                    <div
                      style={{ borderColor: themeConfig.borderLight }}
                      className="text-[11px] font-semibold mb-2 pb-1 border-b flex items-center justify-between"
                    >
                      <span style={{ color: themeConfig.textMuted }}>
                        실제 표시될 모양 (글씨 크기: {FONT_SIZE_CLASSES[inputFontSize]?.label})
                      </span>
                      <span style={{ color: themeConfig.primary }}>형광펜 및 마크다운 적용 확인</span>
                    </div>
                    <FormattedLog
                      content={inputContent}
                      fontSize={inputFontSize}
                      theme={currentTheme}
                    />
                  </div>
                )}
              </div>

              {/* Submit footer */}
              <div
                style={{
                  backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                  borderColor: themeConfig.border,
                }}
                className="px-5 py-3 border-t flex justify-end gap-2 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    color: themeConfig.textSecondary,
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer hover:opacity-85"
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: themeConfig.primary,
                    color: themeConfig.primaryText,
                  }}
                  className="px-4 py-2 font-bold rounded-lg text-xs cursor-pointer shadow-xs hover:opacity-90"
                >
                  {editingLogId ? '수정 완료' : '저장하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Folder Management */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            style={{
              backgroundColor: themeConfig.bgSurface,
              borderColor: themeConfig.border,
              color: themeConfig.textPrimary,
            }}
            className="w-full max-w-md border rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div
              style={{ borderColor: themeConfig.border }}
              className="flex items-center justify-between px-5 py-3.5 border-b"
            >
              <h3 className="font-bold text-sm">보관 폴더 관리</h3>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                style={{ color: themeConfig.textMuted }}
                className="hover:opacity-80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Add folder */}
              <form onSubmit={handleAddFolder} className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="새 폴더 이름 (예: 일상 수다, 설정집)"
                  style={{
                    backgroundColor: themeConfig.bgInput,
                    borderColor: themeConfig.border,
                    color: themeConfig.textPrimary,
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: themeConfig.primary,
                    color: themeConfig.primaryText,
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold shrink-0 cursor-pointer hover:opacity-90"
                >
                  폴더 추가
                </button>
              </form>

              {/* Folder list */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pt-2">
                <span style={{ color: themeConfig.textMuted }} className="text-[11px] font-semibold">
                  기존 폴더 목록
                </span>
                {folders.map((f) => {
                  const count = logs.filter((l) => l.folderId === f.id).length;
                  return (
                    <div
                      key={f.id}
                      style={{
                        backgroundColor: themeConfig.bgInput,
                        borderColor: themeConfig.border,
                      }}
                      className="flex items-center justify-between px-3 py-2 border rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FolderIcon className="w-3.5 h-3.5 opacity-70" />
                        <span className="font-medium">{f.name}</span>
                        <span style={{ color: themeConfig.textMuted }} className="text-[11px]">
                          ({count}개)
                        </span>
                      </div>
                      {folders.length > 1 && (
                        <button
                          onClick={() => handleDeleteFolder(f.id)}
                          className="text-stone-400 hover:text-rose-500 p-1 cursor-pointer"
                          title="폴더 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                borderColor: themeConfig.border,
              }}
              className="px-5 py-3 border-t flex justify-end"
            >
              <button
                onClick={() => setIsFolderModalOpen(false)}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: themeConfig.textSecondary,
                }}
                className="px-4 py-1.5 text-xs font-medium rounded-lg cursor-pointer hover:opacity-85"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
