import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Check, Lock, Sparkles, Volume2, Globe, ArrowRight, X, RefreshCw, FileSpreadsheet, Mic, ChevronRight, ChevronLeft, AlertCircle, ThumbsUp, CheckCircle } from "lucide-react";
import { playAudioFeedback } from "./types";
import staticSheetWords from "../data/staticSheetWords.json";


interface LearningLevel {
  number: number;
  title: string;
  englishTitle: string;
  description: string;
  bilingualGoal: string;
  colorClass: string;
  icon: string;
  personaId: string;
  vocabTip: string;
}

interface HomeWorkspaceProps {
  unlockedLevel: number;
  completedLevels: number[];
  currentTickTime: string;
  bonusMinutes: number;
  setBonusMinutes: React.Dispatch<React.SetStateAction<number>>;
  onLevelStart: (level: LearningLevel) => void;
  onLevelComplete: (lvlNum: number) => void;
  onResetProgress: () => void;
  LEARNING_LEVELS: LearningLevel[];
  dailySecondsLeft: number;
  extraAdClaimsCount: number;
  unlockedAdvertiserGroups: string[];
  onUnlockGroup: (groupKey: string) => void;
  completedGroupsProp?: string[];
  setCompletedGroupsProp?: React.Dispatch<React.SetStateAction<string[]>>;
  completedWordsCount: number;
  studentSemester?: string;
}

interface SheetWord {
  id: string;
  semester: string; // الفصل الدراسي
  word: string;     // الكلمة بالإنجليزية
  meaning: string;  // المعنى بالكامل بالعربية
  ipa?: string;     // الرمز الصوتي والنطق
  imageUrl?: string;// رابط الصورة
  group?: string;   // المجموعة أو التصنيف
  level?: number;   // المستوى الرقمي (1-9)
}

const DEFAULT_SHEET_WORDS: SheetWord[] = [
  // الفصل الدراسي الأول
  {
    id: "def-1",
    semester: "الفصل الدراسي الأول",
    level: 1,
    word: "Understand",
    meaning: "يفهم / يستوعب",
    ipa: "/ˌʌn.dəˈstænd/",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=60",
    group: "أساسيات تواصل"
  },
  {
    id: "def-2",
    semester: "الفصل الدراسي الأول",
    level: 2,
    word: "Beautiful",
    meaning: "جميل / رائع وخلاب",
    ipa: "/ˈbjuː.tɪ.fəl/",
    imageUrl: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=150&auto=format&fit=crop&q=60",
    group: "صفات شائعة"
  },
  {
    id: "def-3",
    semester: "الفصل الدراسي الأول",
    level: 3,
    word: "Language",
    meaning: "اللغة / نظام التواصل",
    ipa: "/ˈlæŋ.ɡwɪdʒ/",
    imageUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=60",
    group: "دراسة وتدريب"
  },
  // الفصل الدراسي الثاني
  {
    id: "def-4",
    semester: "الفصل الدراسي الثاني",
    level: 4,
    word: "Progress",
    meaning: "تقدّم / تطوّر نوعي",
    ipa: "/ˈprəʊ.ɡres/",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150&auto=format&fit=crop&q=60",
    group: "مفاهيم النجاح"
  },
  {
    id: "def-5",
    semester: "الفصل الدراسي الثاني",
    level: 5,
    word: "Challenge",
    meaning: "تحدّي / بذل المجهود",
    ipa: "/tʃæl.ɪndʒ/",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=150&auto=format&fit=crop&q=60",
    group: "مفاهيم النجاح"
  },
  {
    id: "def-6",
    semester: "الفصل الدراسي الثاني",
    level: 6,
    word: "Creative",
    meaning: "إبداعي / مبتكر ومُلهم",
    ipa: "/kriˈeɪ.tɪv/",
    imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=150&auto=format&fit=crop&q=60",
    group: "صفات شائعة"
  },
  // الفصل الدراسي الثالث
  {
    id: "def-7",
    semester: "الفصل الدراسي الثالث",
    level: 7,
    word: "Fluency",
    meaning: "الطلاقة / فصاحة التعبير",
    ipa: "/ˈfluː.ən.si/",
    imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150&auto=format&fit=crop&q=60",
    group: "دراسة وتدريب"
  },
  {
    id: "def-8",
    semester: "الفصل الدراسي الثالث",
    level: 8,
    word: "Vocabulary",
    meaning: "قاموس المفردات / الكلمات",
    ipa: "/vəˈkæb.jʊ.lər.i/",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=150&auto=format&fit=crop&q=60",
    group: "دراسة وتدريب"
  },
  {
    id: "def-9",
    semester: "الفصل الدراسي الثالث",
    level: 9,
    word: "Mastery",
    meaning: "إتقان / تمكّن حقيقي",
    ipa: "/ˈmɑː.stər.i/",
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=150&auto=format&fit=crop&q=60",
    group: "مفاهيم النجاح"
  }
];

const convertToDirectImageUrl = (url: string): string => {
  if (!url) return "";
  const trimmed = url.trim();

  if (trimmed.startsWith("data:") || trimmed.includes("unsplash.com") || trimmed.includes("images.unsplash.com")) {
    return trimmed;
  }

  if (trimmed.includes("drive.google.com")) {
    const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://docs.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
    const queryIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (queryIdMatch && queryIdMatch[1]) {
      return `https://docs.google.com/uc?export=view&id=${queryIdMatch[1]}`;
    }
  }
  
  return trimmed;
};

const parseLevelNum = (val: string, indexFallback: number): number => {
  if (!val) {
    return 1;
  }
  const clean = val.trim().toLowerCase();
  
  const digits = clean.replace(/\D/g, "");
  if (digits) {
    const num = parseInt(digits, 10);
    if (num >= 1 && num <= 9) return num;
  }

  if (clean.includes("one") || clean.includes("first")) return 1;
  if (clean.includes("two") || clean.includes("second")) return 2;
  if (clean.includes("three") || clean.includes("third")) return 3;
  if (clean.includes("four") || clean.includes("fourth")) return 4;
  if (clean.includes("five") || clean.includes("fifth")) return 5;
  if (clean.includes("six") || clean.includes("sixth")) return 6;
  if (clean.includes("seven") || clean.includes("seventh")) return 7;
  if (clean.includes("eight") || clean.includes("eighth")) return 8;
  if (clean.includes("nine") || clean.includes("ninth")) return 9;

  if (clean.includes("أول") || clean.includes("اول") || clean.includes("الأول") || clean.includes("الاول")) return 1;
  if (clean.includes("ثان") || clean.includes("ثني") || clean.includes("الثاني") || clean.includes("تاني")) return 2;
  if (clean.includes("ثالث") || clean.includes("الثالث") || clean.includes("تالت")) return 3;
  if (clean.includes("رابع") || clean.includes("الرابع")) return 4;
  if (clean.includes("خامس") || clean.includes("الخامس")) return 5;
  if (clean.includes("سادس") || clean.includes("السادس")) return 6;
  if (clean.includes("سابع") || clean.includes("السابع")) return 7;
  if (clean.includes("ثامن") || clean.includes("الثامن")) return 8;
  if (clean.includes("تاسع") || clean.includes("التاسع")) return 9;

  return 1;
};

const parseGoogleSheet = async (sheetUrlOrId: string): Promise<SheetWord[]> => {
  let spreadsheetId = sheetUrlOrId.trim();
  const matches = sheetUrlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    spreadsheetId = matches[1];
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("فشلت عملية سحب جدول البيانات. يرجى مراجعة صلاحيات المشاركة للملف وجعله متاحاً للكل (Anyone with link).");
  }
  
  const text = await res.text();
  const jsonStart = text.indexOf("google.visualization.Query.setResponse(");
  if (jsonStart === -1) {
    throw new Error("تنسيق رد قوقل غير متوافق. تأكد من إعدادات الورقة.");
  }
  
  const rawJson = text.substring(jsonStart + "google.visualization.Query.setResponse(".length, text.length - 2);
  const data = JSON.parse(rawJson);
  
  if (!data?.table?.rows) {
    throw new Error("لا توجد الصفوف المطلوبة في ورقة بيانات قوقل.");
  }

  const table = data.table;
  const cols = table.cols.map((c: any) => (c?.label || "").trim().toLowerCase());
  
  const findColumnIndex = (possibleHeaders: string[]): number => {
    return cols.findIndex((col: string) => 
      possibleHeaders.some(h => col.includes(h) || h.includes(col))
    );
  };

  const semIdx = findColumnIndex(["الفصل", "فصل", "ترم", "term", "chapter", "semester"]);
  const wordIdx = findColumnIndex(["الكلمة", "كلمة", "مفردة", "word", "english", "en"]);
  const meanIdx = findColumnIndex(["المعنى", "معنى", "ترجمة", "meaning", "translation", "arabic", "ar", "definition", "التعريف", "تعريف"]);
  const ipaIdx = findColumnIndex(["النطق", "صوت", "لفظ", "ipa", "pronunciation", "phonics"]);
  const imgIdx = findColumnIndex(["dirkt link", "direct link", "dirkt", "direct", "الصورة", "رابط", "image", "url", "link", "photo", "pic"]);
  const grpIdx = findColumnIndex(["group nama", "groupname", "المجموعة", "مجموعة", "تصنيف", "category", "group", "class"]);
  const levelIdx = findColumnIndex(["المستوى", "المستوي", "مستوي", "مستوى", "level", "lvl"]);

  const parsedWords: SheetWord[] = [];

  table.rows.forEach((row: any, rIdx: number) => {
    if (!row?.c) return;
    
    const getVal = (colIndex: number): string => {
      if (colIndex === -1) return "";
      const cell = row.c[colIndex];
      if (!cell) return "";
      if (cell.v === null || cell.v === undefined) return "";
      return String(cell.v).trim();
    };

    const word = getVal(wordIdx);
    const meaning = getVal(meanIdx);

    if (!word || word.toLowerCase() === "word" || word === "الكلمة") return;

    parsedWords.push({
      id: `synced-${rIdx}-${Math.random().toString(36).substring(4)}`,
      semester: getVal(semIdx) || "الفصل الدراسي الأول",
      word: word,
      meaning: meaning,
      ipa: getVal(ipaIdx) || "",
      imageUrl: convertToDirectImageUrl(getVal(imgIdx)),
      group: getVal(grpIdx) || "عادية",
      level: parseLevelNum(getVal(levelIdx), rIdx)
    });
  });

  if (parsedWords.length === 0) {
    throw new Error("يتعذر العثور على أي كلمات مطابقة. يرجى التحقق من رؤوس ورقة البيانات.");
  }

  return parsedWords;
};

const isSpeechMatched = (targetWord: string, transcriptText: string): boolean => {
  const target = targetWord.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const cleanSpeech = transcriptText.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

  if (!target || !cleanSpeech) return false;

  // Exact or direct substring match
  if (cleanSpeech.includes(target) || target.includes(cleanSpeech)) {
    return true;
  }

  // Relax matching heavily for words with 1 or 2 characters so they are heard/accepted easily:
  if (target.length <= 2) {
    // If the transcript is extremely short as well, overlapping safe characters works
    if (cleanSpeech.length <= 4) {
      for (const char of target) {
        if (cleanSpeech.includes(char)) return true;
      }
    }

    // Phonetic mapping for typical failures when uttering short words
    const soundAlikes: { [key: string]: string[] } = {
      "a": ["ay", "ei", "hey", "i", "e", "eh", "one"],
      "an": ["and", "in", "am", "on", "any", "n"],
      "at": ["it", "cat", "ate", "et", "ad", "act", "as"],
      "be": ["bee", "by", "b", "me", "he", "we"],
      "by": ["buy", "bye", "by", "pi", "my", "hi", "p"],
      "do": ["due", "to", "dew", "duo", "you", "u"],
      "go": ["god", "gold", "good", "no", "co", "so", "u"],
      "he": ["she", "him", "her", "the", "hi", "hey", "h"],
      "hi": ["high", "hey", "hello", "how", "I", "i"],
      "if": ["is", "it", "eve", "off", "of", "f"],
      "in": ["inn", "on", "it", "an", "into", "and", "en"],
      "is": ["es", "it", "his", "as", "if", "ease", "s"],
      "it": ["eat", "its", "at", "in", "is", "et", "if", "t"],
      "me": ["my", "we", "be", "mi", "may", "m"],
      "my": ["me", "mi", "hi", "by", "may", "i"],
      "no": ["know", "nod", "not", "now", "so", "go", "n"],
      "of": ["off", "have", "on", "up", "if", "v"],
      "on": ["one", "un", "in", "of", "an", "own", "o"],
      "or": ["our", "are", "for", "her", "r"],
      "so": ["sew", "show", "saw", "no", "go", "to", "s"],
      "to": ["two", "too", "do", "so", "go", "through", "t"],
      "up": ["app", "off", "hope", "above", "p"],
      "us": ["as", "is", "bus", "use", "has", "s"],
      "we": ["with", "be", "me", "he", "way"]
    };

    if (soundAlikes[target]) {
      if (soundAlikes[target].some(alias => cleanSpeech.includes(alias) || alias.includes(cleanSpeech))) {
        return true;
      }
    }

    if (target.length === 1 && cleanSpeech.startsWith(target)) {
      return true;
    }
  }

  // Fallback fuzzy overlap mapping (share half the chars)
  if (target.length <= 3) {
    let matches = 0;
    const cleanChars = cleanSpeech.split("");
    for (const char of target.split("")) {
      const idx = cleanChars.indexOf(char);
      if (idx !== -1) {
        matches++;
        cleanChars.splice(idx, 1);
      }
    }
    const ratio = matches / target.length;
    if (ratio >= 0.5) return true;
  }

  return false;
};

export default function HomeWorkspace({
  unlockedLevel,
  completedLevels,
  currentTickTime,
  bonusMinutes,
  setBonusMinutes,
  onLevelStart,
  onLevelComplete,
  onResetProgress,
  LEARNING_LEVELS,
  dailySecondsLeft,
  extraAdClaimsCount,
  unlockedAdvertiserGroups,
  onUnlockGroup,
  completedGroupsProp,
  setCompletedGroupsProp,
  completedWordsCount,
  studentSemester = "الفصل الدراسي الأول"
}: HomeWorkspaceProps) {
  const [sheetWords, setSheetWords] = useState<SheetWord[]>(() => {
    const saved = localStorage.getItem("stitchlab_sheet_words");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return (staticSheetWords && staticSheetWords.length > 0) ? (staticSheetWords as SheetWord[]) : DEFAULT_SHEET_WORDS;
  });

  const [selectedLevel, setSelectedLevel] = useState<LearningLevel | null>(null);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [lockedLevelNotice, setLockedLevelNotice] = useState<number | null>(null);

  const groupsInfo = useMemo(() => {
    const map = new Map<string, { group: string; levels: Set<number>; semesters: Set<string> }>();
    sheetWords.forEach(w => {
      if (w.group && w.group.trim()) {
        const gName = w.group.trim();
        const existing = map.get(gName) || { group: gName, levels: new Set<number>(), semesters: new Set<string>() };
        if (w.level) existing.levels.add(w.level);
        if (w.semester) existing.semesters.add(w.semester.trim());
        map.set(gName, existing);
      }
    });
    return Array.from(map.values()).map(info => ({
      group: info.group,
      levels: Array.from(info.levels).sort((a,b) => a - b),
      semesters: Array.from(info.semesters)
    }));
  }, [sheetWords]);

  const filteredGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return [];
    const query = groupSearchQuery.toLowerCase().trim();
    return groupsInfo.filter(info => 
      info.group.toLowerCase().includes(query)
    );
  }, [groupsInfo, groupSearchQuery]);

  // Active Practice/Training States (Minimalist Tech-Style Training Screen)
  const [activeTrainingLevel, setActiveTrainingLevel] = useState<LearningLevel | null>(null);
  const [activeTrainingSemester, setActiveTrainingSemester] = useState<string>("");
  const [activeTrainingGroup, setActiveTrainingGroup] = useState<string>("");
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [singleInput, setSingleInput] = useState<string>("");
  const [successCount, setSuccessCount] = useState<number>(0);
  const [showTryAgain, setShowTryAgain] = useState<boolean>(false);
  const [spellingFeedback, setSpellingFeedback] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechStatus, setSpeechStatus] = useState<string>("");
  const [speechText, setSpeechText] = useState<string>("");
  const [speechScore, setSpeechScore] = useState<boolean | null>(null);

  const [hasListened, setHasListened] = useState<boolean>(false);
  const [dismissedSpecialBubble, setDismissedSpecialBubble] = useState<boolean>(false);
  const [showCompletionWarning, setShowCompletionWarning] = useState<boolean>(false);

  // --- PROGRESSIVE WEB APP (PWA) AND OFFLINE / ADSTERRA ADVERTISING MANAGEMENT ---
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    // Check if the event is already stashed on window
    const savedPrompt = (window as any).deferredInstallPrompt;
    if (savedPrompt) {
      setInstallPromptEvent(savedPrompt);
      setShowInstallBanner(true);
    }

    const handleInstallable = (e: any) => {
      setInstallPromptEvent(e.detail || (window as any).deferredInstallPrompt);
      setShowInstallBanner(true);
    };

    window.addEventListener("pwa-installable", handleInstallable);
    return () => window.removeEventListener("pwa-installable", handleInstallable);
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = installPromptEvent || (window as any).deferredInstallPrompt;
    if (!promptEvent) return;
    
    // Show PWA browser install prompt
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User installation choice outcome: ${outcome}`);
    
    // Cleanup stashes
    setInstallPromptEvent(null);
    (window as any).deferredInstallPrompt = null;
    setShowInstallBanner(false);
  };

  const [completedGroupsLocal, setCompletedGroupsLocal] = useState<string[]>(() => {
    const saved = localStorage.getItem("stitchlab_completed_groups");
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const completedGroups = completedGroupsProp !== undefined ? completedGroupsProp : completedGroupsLocal;
  
  const setCompletedGroups = (newVal: string[] | ((prev: string[]) => string[])) => {
    if (setCompletedGroupsProp) {
      if (typeof newVal === "function") {
        setCompletedGroupsProp(newVal);
      } else {
        setCompletedGroupsProp(newVal);
      }
    } else {
      if (typeof newVal === "function") {
        setCompletedGroupsLocal(newVal as any);
      } else {
        setCompletedGroupsLocal(newVal);
      }
    }
  };

  const allSortedGroups = useMemo(() => {
    const uniqueCombosMap = new Map<string, { level: number; semester: string; group: string; key: string }>();
    sheetWords.forEach(w => {
      if (w.level && w.semester && w.group && w.group.trim() && w.semester.trim()) {
        const lvl = w.level;
        const sem = w.semester.trim();
        const grp = w.group.trim();
        const key = `${lvl}_${sem}_${grp}`;
        if (!uniqueCombosMap.has(key)) {
          uniqueCombosMap.set(key, { level: lvl, semester: sem, group: grp, key });
        }
      }
    });

    const list = Array.from(uniqueCombosMap.values());
    
    // Sort sequence: Level, Semester, Group
    list.sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      if (a.semester !== b.semester) {
        return a.semester.localeCompare(b.semester, "ar");
      }
      return a.group.localeCompare(b.group, "ar");
    });

    return list;
  }, [sheetWords]);

  const isGroupSequenceUnlocked = useCallback((groupKey: string): boolean => {
    const list = allSortedGroups;
    if (list.length === 0) return true;
    
    const index = list.findIndex(g => g.key === groupKey);
    if (index <= 0) {
      return true;
    }
    
    // If the group itself is already completed, it is always unlocked/accessible
    if (completedGroups.includes(groupKey)) {
      return true;
    }

    // Otherwise, it is unlocked only if the immediately previous group is completed
    const prevGroupKey = list[index - 1].key;
    return completedGroups.includes(prevGroupKey);
  }, [allSortedGroups, completedGroups]);

  const [pendingUnlockGroupKey, setPendingUnlockGroupKey] = useState<string | null>(null);
  const [lastAttemptedAction, setLastAttemptedAction] = useState<"extra_time" | "new_group">("extra_time");

  const handlePwaAction = (action: "extra_time" | "new_group", chosenGroupKey?: string) => {
    // Save current action so we can resume automatically as soon as internet returns
    setLastAttemptedAction(action);
    const resolvedGroupKey = chosenGroupKey || allSortedGroups.find(g => !isGroupSequenceUnlocked(g.key))?.key || null;
    if (resolvedGroupKey) {
      setPendingUnlockGroupKey(resolvedGroupKey);
    }

    // 1. Check navigator.onLine for smart internet detection
    if (!navigator.onLine) {
      setOfflineError("عذراً الجهاز غير متصل بالإنترنت. يرجى التحقق من اتصالك بالشبكة لتنزيل وفتح فصول المجموعات الجديدة وإضافة وقت التعلم المكافء! 📡");
      return;
    }

    setOfflineError(null);

    // Apply reward instantly while the Social Bar runs universally
    if (action === "extra_time") {
      setBonusMinutes(prevBonus => prevBonus + 15);
      alert("🎉 مبارك! تمت إضافة 15 دقيقة إضافية مجاناً لحسابك لمواصلة التعلم.");
    } else {
      if (resolvedGroupKey) {
        onUnlockGroup(resolvedGroupKey);
        alert("🔓 مبارك! تم فتح قفل المجموعة الدراسية بنجاح.");
      } else {
        const firstLocked = allSortedGroups.find(g => !isGroupSequenceUnlocked(g.key));
        if (firstLocked) {
          onUnlockGroup(firstLocked.key);
          alert("🔓 مبارك! تم فتح قفل المجموعة الدراسية بنجاح.");
        }
      }
    }
  };

  // Re-connect trigger: as soon as internet returns, load ad automatically to reward/unlock item!
  useEffect(() => {
    const handleOnline = () => {
      if (offlineError) {
        setOfflineError(null);
        handlePwaAction(lastAttemptedAction, pendingUnlockGroupKey || undefined);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [offlineError, lastAttemptedAction, pendingUnlockGroupKey]);

  const [sheetLinkInput, setSheetLinkInput] = useState(() => {
    return localStorage.getItem("stitchlab_sheet_link") || "https://docs.google.com/spreadsheets/d/1BtCUNuf34uVEaQS_hPbINw0-ogACWzyKsN426QftNwI/edit?usp=drivesdk";
  });

  const [selectedSemester, setSelectedSemester] = useState<string>("الفصل الدراسي الأول");
  const [modalSemester, setModalSemester] = useState<string>("");
  const [modalGroup, setModalGroup] = useState<string>("");

  const activeStudyWords = useMemo(() => {
    if (!selectedLevel || !modalSemester || !modalGroup) return [];
    return sheetWords.filter(w => 
      w.level === selectedLevel.number && 
      w.semester === modalSemester && 
      w.group === modalGroup
    );
  }, [sheetWords, selectedLevel, modalSemester, modalGroup]);

  const trainingWords = useMemo(() => {
    if (!activeTrainingLevel) return [];
    
    // Attempt filtering by selected semester & group first (from modal configuration)
    let words = sheetWords.filter(w => w.level === activeTrainingLevel.number);
    if (activeTrainingSemester) {
      words = words.filter(w => w.semester === activeTrainingSemester);
    }
    if (activeTrainingGroup) {
      words = words.filter(w => w.group === activeTrainingGroup);
    }
    
    if (words.length > 0) return words;
    
    // First fallback: retrieve any words for this level
    words = sheetWords.filter(w => w.level === activeTrainingLevel.number);
    if (words.length > 0) return words;
    
    // Second fallback: retrieve preset developer sample words
    return DEFAULT_SHEET_WORDS.filter(w => w.level === activeTrainingLevel.number);
  }, [activeTrainingLevel, sheetWords, activeTrainingSemester, activeTrainingGroup]);

  const filteredUniqueGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return [];
    const query = groupSearchQuery.toLowerCase().trim();
    return allSortedGroups.filter(item => 
      item.group.toLowerCase().includes(query)
    );
  }, [allSortedGroups, groupSearchQuery]);

  useEffect(() => {
    setSingleInput("");
    setSuccessCount(0);
    setShowTryAgain(false);
    setSpeechText("");
    setSpeechStatus("");
    setSpeechScore(null);
    setIsListening(false);
    setHasListened(false);
    setDismissedSpecialBubble(false);
    setShowCompletionWarning(false);
    setSpellingFeedback({ type: null, msg: "" });
  }, [currentWordIndex, activeTrainingLevel]);

  const uniqueSemestersInModal = useMemo(() => {
    if (!selectedLevel) return [];
    const sems = new Set<string>();
    sheetWords.forEach(w => {
      if (w.level === selectedLevel.number && w.semester) {
        sems.add(w.semester.trim());
      }
    });
    return Array.from(sems);
  }, [sheetWords, selectedLevel]);

  const uniqueGroupsInModal = useMemo(() => {
    if (!selectedLevel || !modalSemester) return [];
    const filtered = sheetWords.filter(w => 
      w.level === selectedLevel.number && 
      w.semester === modalSemester
    );
    const groups = new Set<string>();
    filtered.forEach(w => {
      if (w.group && w.group.trim()) {
        groups.add(w.group.trim());
      }
    });
    const list = Array.from(groups);
    
    // Sort sequence: Unlocked / open groups first
    list.sort((a, b) => {
      const keyA = `${selectedLevel.number}_${modalSemester}_${a}`;
      const keyB = `${selectedLevel.number}_${modalSemester}_${b}`;
      const unlA = isGroupSequenceUnlocked(keyA) ? 1 : 0;
      const unlB = isGroupSequenceUnlocked(keyB) ? 1 : 0;
      
      if (unlA !== unlB) {
        return unlB - unlA; // Unlocked (1) first
      }
      return a.localeCompare(b, "ar");
    });
    return list;
  }, [sheetWords, selectedLevel, modalSemester, isGroupSequenceUnlocked]);

  useEffect(() => {
    setModalGroup("");
  }, [modalSemester, selectedLevel]);

  useEffect(() => {
    if (selectedLevel) {
      const levelSems = uniqueSemestersInModal;
      if (levelSems.length > 0) {
        if (levelSems.includes(selectedSemester)) {
          setModalSemester(selectedSemester);
        } else {
          setModalSemester(levelSems[0]);
        }
      } else {
        setModalSemester("");
      }
    } else {
      setModalSemester("");
    }
  }, [selectedLevel, uniqueSemestersInModal]);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("All");

  useEffect(() => {
    // With Static Site Generation (SSG), we do not automatically fetch on client-side mount.
    // The data is pre-compiled at build-time, which guarantees instant loading and saves API quota.
    // The user can still trigger manual fetching at any time via the "Sync" settings button.
  }, []);

  const uniqueSemesters = useMemo(() => {
    const sems = new Set<string>();
    sheetWords.forEach(w => {
      if (w.semester) sems.add(w.semester);
    });
    if (sems.size === 0) {
      sems.add("الفصل الدراسي الأول");
    }
    return Array.from(sems);
  }, [sheetWords]);

  useEffect(() => {
    if (!uniqueSemesters.includes(selectedSemester)) {
      setSelectedSemester(uniqueSemesters[0] || "الفصل الدراسي الأول");
    }
  }, [uniqueSemesters, selectedSemester]);

  const semesterWords = useMemo(() => {
    return sheetWords.filter(w => w.semester === selectedSemester);
  }, [sheetWords, selectedSemester]);

  // Real-time group search logic (supports any single word match)
  const groupMatchingWordsResults = useMemo(() => {
    if (!groupSearchQuery.trim()) return [];
    const query = groupSearchQuery.toLowerCase().trim();
    return allSortedGroups.filter(item => item.group.toLowerCase().includes(query));
  }, [allSortedGroups, groupSearchQuery]);

  useEffect(() => {
    setSelectedGroup("All");
  }, [selectedSemester]);

  const handleSyncGoogleSheet = async () => {
    if (!sheetLinkInput.trim()) {
      setSyncError("الرجاء إدخال رابط أو معرف جدول قوقل أولاً.");
      return;
    }

    setSyncLoading(true);
    setSyncError("");
    setSyncSuccess(false);

    try {
      const parsed = await parseGoogleSheet(sheetLinkInput);
      setSheetWords(parsed);
      localStorage.setItem("stitchlab_sheet_words", JSON.stringify(parsed));
      localStorage.setItem("stitchlab_sheet_link", sheetLinkInput.trim());
      localStorage.setItem("stitchlab_sheet_synced_dirkt_v2", "true");
      setSyncSuccess(true);
      
      setTimeout(() => {
        setSyncSuccess(false);
        setShowConfig(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "فشلت قراءة ورقة البيانات بسبب مشاكل اتصال أو الصلاحيات.");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleLoadDemoSheet = () => {
    setSheetWords((staticSheetWords && staticSheetWords.length > 0) ? (staticSheetWords as SheetWord[]) : DEFAULT_SHEET_WORDS);
    localStorage.removeItem("stitchlab_sheet_words");
    localStorage.removeItem("stitchlab_sheet_link");
    setSheetLinkInput("");
    setSyncSuccess(true);
    setSyncError("");
    setTimeout(() => {
      setSyncSuccess(false);
      setShowConfig(false);
    }, 2000);
  };

  if (activeTrainingLevel && trainingWords.length > 0) {
    const currentWord = trainingWords[currentWordIndex];
    const isSpecialWord = ["am", "is", "are", "was", "were", "have", "has"].includes(currentWord.word.toLowerCase().trim());
    const isListeningDone = hasListened;
    const isSpellingDone = successCount >= 3;
    const isSpeakingDone = speechScore === true;
    const isCurrentWordFullyCompleted = isListeningDone && isSpellingDone && isSpeakingDone;

    const handlePrevWord = () => {
      if (currentWordIndex > 0) {
        setCurrentWordIndex(prev => prev - 1);
      }
    };

    const handleNextWord = () => {
      const isWordDone = successCount >= 3 && hasListened && speechScore === true;
      if (!isWordDone) {
        setShowCompletionWarning(true);
        return;
      }

      setShowCompletionWarning(false);
      if (currentWordIndex < trainingWords.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
      } else {
        // Open the CPM Link in a new window/tab to reward publisher CPM traffic
        try {
          window.open("https://www.effectivecpmnetwork.com/ktczatvrx?key=73981497b63984cc0d895e217c1ce2e2", "_blank");
        } catch (e) {
          console.error("Failed to open link:", e);
        }

        // Save completed group key in completed groups!
        const groupKey = `${activeTrainingLevel.number}_${activeTrainingSemester}_${activeTrainingGroup}`;
        const newCompleted = [...completedGroups];
        if (!newCompleted.includes(groupKey)) {
          newCompleted.push(groupKey);
          setCompletedGroups(newCompleted);
          localStorage.setItem("stitchlab_completed_groups", JSON.stringify(newCompleted));
        }

        // Mark level as completed!
        onLevelComplete(activeTrainingLevel.number);
        setActiveTrainingLevel(null);
      }
    };

    const handleListenClick = () => {
      setHasListened(true);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = "en-GB";
        utterance.rate = 0.82; // slightly slower for better British clarity
        
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const britishVoices = voices.filter(v => 
            v.lang.toLowerCase().includes("gb") || 
            v.lang.toLowerCase().includes("uk") ||
            v.name.toLowerCase().includes("united kingdom") ||
            v.name.toLowerCase().includes("great britain")
          );
          const candidates = britishVoices.length > 0 ? britishVoices : voices;
          const matchedVoice = candidates.find(v => 
            v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("george") || v.name.toLowerCase().includes("hazel") || v.name.toLowerCase().includes("susan")
          ) || candidates[0];
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }
        }
        window.speechSynthesis.speak(utterance);
      }
    };

    const handleMicrophoneClick = () => {
      if (isListening) {
        setIsListening(false);
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechStatus("التعرف الصوتي غير مدعوم في متصفحك حالياً، تم تفعيل تجربة محاكاة التقييم.");
        setTimeout(() => {
          setSpeechText(currentWord.word);
          setSpeechScore(true);
          setSpeechStatus("Great job! 🎉 مستواك ممتاز! النطق صحيح ومطابق (محاكاة) ✓");
          playAudioFeedback(true);
        }, 1200);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-GB"; // Enforce British English dialect input recognition
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setSpeechStatus("جاري الاستماع لنطقك... 🎙️");
          setSpeechScore(null);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setSpeechText(transcript);
          
          if (isSpeechMatched(currentWord.word, transcript)) {
            setSpeechScore(true);
            setSpeechStatus(`Great job! 🎉 مستواك رائع ومطابق! سمعنا: "${transcript}" ✓`);
            playAudioFeedback(true);
          } else {
            setSpeechScore(false);
            setSpeechStatus(`Try again! ⚠️ لم يتطابق تماماً. لقد سمعنا: "${transcript}". حاول مرة أخرى!`);
            playAudioFeedback(false);
          }
        };

        recognition.onerror = (e: any) => {
          console.error(e);
          setIsListening(false);
          setSpeechStatus("لم يتم تفعيل الصوت بنجاح، يرجى المحاولة ثانية وتفعيل إذن الميكروفون.");
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (e) {
        console.error(e);
        setIsListening(false);
        setSpeechStatus("خطأ في تشغيل الميكروفون.");
      }
    };

    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-[#FFF0F3] via-[#FFE3E8] to-[#FFD6DC] text-slate-900 flex flex-col justify-between py-6 px-4 md:px-6 animate-fadeIn" dir="rtl">
        {/* Header toolbar */}
        <div className="max-w-md w-full mx-auto bg-white/95 backdrop-blur-md border border-pink-200/50 rounded-2xl p-2 px-3 flex items-center justify-between mb-4 shadow-[0_4px_20px_rgba(244,63,94,0.05)] transition-all" id="training-header-toolbar">
          <button
            type="button"
            onClick={() => {
              const prev = activeTrainingLevel;
              setActiveTrainingLevel(null);
              setSelectedLevel(prev);
            }}
            className="w-9 h-9 bg-pink-50/50 hover:bg-pink-100 text-slate-700 hover:text-pink-600 border border-pink-100 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="رجوع لشاشة الاختيار"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="text-center flex flex-col items-center">
            <span className="text-[10px] text-purple-700 font-extrabold bg-purple-50/85 px-2 py-0.5 rounded-full border border-purple-100/30">
              {activeTrainingGroup}
            </span>
            <span className="text-[11px] text-slate-600 font-bold mt-0.5 font-sans">
              المستوى {activeTrainingLevel?.number} - {activeTrainingSemester}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5 text-[10px] font-black text-slate-600 font-mono">
            {currentWordIndex + 1} / {trainingWords.length}
          </div>
        </div>

        {/* 📊 Progress indicator/bar placed at the top of the training screen */}
        <div className="max-w-md w-full mx-auto bg-white/95 backdrop-blur-md border border-pink-100/70 rounded-2xl p-3.5 shadow-[0_6px_25px_rgba(244,63,94,0.03)] select-none mb-1" id="top-progress-indicator-box">
          <div className="flex items-center justify-between text-[11px] font-black text-slate-600 mb-2 font-sans">
            <span className="flex items-center gap-1 text-slate-700">🏆 مؤشر تقدم المجموعة: <span className="text-purple-700">{currentWordIndex + 1} / {trainingWords.length}</span></span>
            <span className="text-pink-600 font-black">{Math.round(((currentWordIndex + 1) / trainingWords.length) * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5 relative animate-pulse">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-pink-400 to-pink-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentWordIndex + 1) / trainingWords.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Practice Body Center Grid */}
        <div className="max-w-md w-full mx-auto space-y-5 flex-1 flex flex-col justify-start">
          
          {/* STEP 1: Full-Size Image & Beautiful Arabic Translation */}
          <div className="w-full glass-card p-6 relative overflow-hidden ring-1 ring-pink-100">
            {/* Word image card showing FULL IMAGE without crop restriction */}
            <div className="w-full min-h-[190px] max-h-[300px] mt-1 bg-white/80 border border-pink-100/40 rounded-2xl overflow-hidden flex items-center justify-center p-3 shadow-inner">
              {currentWord.imageUrl ? (
                <img 
                  src={currentWord.imageUrl} 
                  alt={currentWord.word} 
                  referrerPolicy="no-referrer"
                  className="max-h-[260px] w-auto max-w-full object-contain rounded-xl select-none animate-fadeIn transition-all duration-500 ease-out"
                />
              ) : (
                <div className="text-center p-6 flex flex-col items-center justify-center">
                  <span className="text-5xl select-none mb-3">📸</span>
                  <span className="text-xs text-slate-400 font-mono tracking-wider mt-1">{currentWord.word.toUpperCase()}</span>
                </div>
              )}
            </div>
            
            {/* Semantic layout (Beautiful Arabic Meaning) */}
            <div className="text-center mt-5 space-y-1 w-full">
              <div className="text-xl md:text-2xl font-extrabold text-slate-800 leading-normal tracking-wide antialiased transition-all">
                {currentWord.meaning}
              </div>
            </div>
          </div>

          {/* STEP 2: Write 3 times using a single input field to track progress sequentially */}
          <div className="w-full glass-card p-6 space-y-4 relative overflow-hidden ring-1 ring-pink-100">
            
            <div className="flex justify-between items-center text-[11px] text-slate-505 font-bold border-b border-pink-100 pb-2.5 mb-1">
              <span className="text-slate-550">اكتب الكلمة بالإنجليزية (3 مرات):</span>
            </div>

            <div className="relative w-full">
              <input
                type="text"
                value={singleInput}
                disabled={successCount >= 3}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const typing = singleInput.trim().toLowerCase();
                    const target = currentWord.word.toLowerCase();
                    if (!typing) return;
                    if (typing === target) {
                      setShowTryAgain(false);
                      setSpellingFeedback({ type: "success", msg: "Great job! 🎉 إجابة صحيحة (أحسنت صنعاً!)" });
                      playAudioFeedback(true);
                      setTimeout(() => {
                        setSuccessCount(prev => {
                          const next = prev + 1;
                          return next > 3 ? 3 : next;
                        });
                        setSingleInput("");
                        setSpellingFeedback({ type: null, msg: "" });
                      }, 1200);
                    } else {
                      setShowTryAgain(true);
                      setSpellingFeedback({ type: "error", msg: "Try again! ⚠️ تهجئة غير صحيحة (حاول مجدداً)" });
                      playAudioFeedback(false);
                    }
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setSingleInput(val);
                  const typing = val.trim().toLowerCase();
                  const target = currentWord.word.toLowerCase();
                  
                  if (typing === target) {
                    setShowTryAgain(false);
                    setSpellingFeedback({ type: "success", msg: "Great job! 🎉 إجابة صحيحة (أحسنت صنعاً!)" });
                    playAudioFeedback(true);
                    
                    setTimeout(() => {
                      setSuccessCount(prev => {
                        const next = prev + 1;
                        return next > 3 ? 3 : next;
                      });
                      setSingleInput("");
                      setSpellingFeedback({ type: null, msg: "" });
                    }, 1200);
                  } else {
                    // Check if this typed text is completely off (not a prefix or doesn't match)
                    if (typing.length > 0 && !target.startsWith(typing)) {
                      if (!showTryAgain) {
                        setShowTryAgain(true);
                        setSpellingFeedback({ type: "error", msg: "Try again! ⚠️ تهجئة غير صحيحة (حاول مجدداً)" });
                        playAudioFeedback(false);
                      }
                    } else {
                      setShowTryAgain(false);
                      setSpellingFeedback({ type: null, msg: "" });
                    }
                  }
                }}
                placeholder={successCount >= 3 ? "تمت الكتابة ٣ مرات بنجاح! 🎉" : "اكتب الكلمة بالإنجليزية هنا..."}
                className={`w-full bg-white/50 text-slate-900 border-2 ${
                  successCount >= 3 
                    ? "border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/10" 
                    : showTryAgain
                      ? "border-rose-400 focus:ring-rose-100 focus:border-rose-500"
                      : "border-slate-200/60 focus:border-pink-500 focus:ring-pink-100"
                } rounded-xl px-4 py-3 text-xs font-mono tracking-wide focus:outline-none transition-all text-left placeholder:text-slate-400 font-bold`}
                dir="ltr"
              />
            </div>

            {spellingFeedback.msg && (
              <p className={`text-xs font-black text-center mt-2.5 px-3 py-1.5 rounded-xl border animate-fadeIn transition-all ${
                spellingFeedback.type === "success"
                  ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                  : "bg-rose-50 border-rose-250 text-rose-650"
              }`}>
                {spellingFeedback.msg}
              </p>
            )}

            {/* Display green circles representing successful writes */}
            <div className="flex justify-center items-center gap-3.5 pt-1">
              {[1, 2, 3].map((num) => {
                const isCompleted = successCount >= num;
                return (
                  <div 
                    key={num} 
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isCompleted 
                        ? "bg-emerald-500 border-emerald-600 text-white scale-110 shadow-md shadow-emerald-500/25" 
                        : "bg-white/40 border-slate-200 text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 font-black" />
                    ) : (
                      <span className="text-[10px] font-mono font-bold">{num}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Pronunciation block (أستمع & انطق الكلمة) as distinct boxes */}
          <div className="w-full glass-card p-6 space-y-4 ring-1 ring-pink-100">
            
            {/* Box 1: أستمع */}
            <div className="bg-white/80 border border-pink-100/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-slate-800">أستمع للكلمة</h4>
              </div>
              <button
                type="button"
                onClick={handleListenClick}
                className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold active:scale-[0.96] shadow-md shadow-purple-600/10 hover:shadow-purple-600/20"
              >
                <span>أستمع 🔊</span>
              </button>
            </div>

            {/* Special bubble alert for pronoun linking on helper verbs */}
            {isSpecialWord && !dismissedSpecialBubble && (
              <div className="bg-amber-50 border border-amber-250/90 rounded-2xl p-4 text-right relative text-xs leading-relaxed animate-fadeIn shadow-sm">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex gap-2 text-amber-900 font-extrabold items-center">
                    <span className="text-sm">🇬🇧</span>
                    <span>تنبيه تدريب النطق باللهجة البريطانية:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedSpecialBubble(true)}
                    className="text-amber-500 hover:text-amber-800 transition-colors cursor-pointer text-xs px-2 py-1 rounded-lg hover:bg-amber-100 shrink-0 font-black border border-amber-200/50"
                    title="قفل التنبيه"
                  >
                    قفل ✕
                  </button>
                </div>
                <p className="mt-2.5 text-[10.5px] font-bold text-slate-700 font-sans leading-relaxed">
                  الكلمات القصيرة مثل (<span className="font-mono text-purple-700 font-black">{currentWord.word}</span>) يصعب على محرك التعرف الصوتي التقاطها بمفردها بدقة. <span className="underline decoration-amber-500 decoration-2 font-black text-slate-800">توجيه هام:</span> عند ضغط الميكروفون ونطقها، يجب عليك ربطها بضمير مناسب بصوت واضح ومستمر (مثال: انطق <span className="font-black text-purple-800 underline bg-pink-50 px-1 rounded">"I am"</span> بدلاً من نطق "am" بمفردها، أو انطق <span className="font-black text-purple-800 underline bg-pink-50 px-1 rounded">"he is"</span>، أو <span className="font-black text-purple-800 underline bg-pink-50 px-1 rounded">"we were"</span>) ليتعرف عليها النظام ويقيم نطقك بنجاح باهر!
                </p>
              </div>
            )}

            {/* Box 2: انطق الكلمة */}
            <div className="bg-white/80 border border-pink-100/50 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-slate-800">انطق الكلمة</h4>
                </div>
                <button
                  type="button"
                  onClick={handleMicrophoneClick}
                  className={`py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold active:scale-[0.96] border ${
                    isListening 
                      ? "border-rose-500 bg-rose-500/10 text-rose-600 animate-pulse" 
                      : "border-pink-300 bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200"
                  } cursor-pointer`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>انطق الكلمة 🎙️</span>
                </button>
              </div>

              {/* Microphone live feedback assessment message feedback */}
              {speechStatus && (
                <div className={`text-center text-[11px] font-bold p-3 rounded-xl border transition-all ${
                  speechScore === true 
                    ? "border-emerald-250 bg-emerald-50 text-emerald-700" 
                    : speechScore === false 
                      ? "border-rose-250 bg-rose-50/60 text-rose-650 animate-fadeIn" 
                      : "border-pink-100 bg-pink-50/50 text-purple-700"
                } font-sans leading-relaxed`}>
                  <div className="flex justify-center items-center gap-1.5 mb-1">
                    <span className="font-extrabold">{speechScore === true ? "🏆 نطق صحيح وممتاز!" : speechScore === false ? "⚠️ محاولة غير متطابقة" : "🎙️ حالة النطق"}</span>
                  </div>
                  <span>{speechStatus}</span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Bottom Modern Elegant Navigation Bar (Prev left, Next right) */}
        <div className="max-w-md w-full mx-auto flex flex-col gap-2.5 mt-4">
          
          {currentWordIndex === trainingWords.length - 1 && (
            <div className="w-full bg-gradient-to-br from-purple-700 via-pink-600 to-indigo-700 rounded-2xl p-4 text-white text-center shadow-lg border border-purple-500/20 animate-fadeIn" dir="rtl">
              <div className="flex items-center justify-center gap-1.5 mb-2.5">
                <span className="text-lg">🎉</span>
                <span className="text-[11px] font-black tracking-wide text-indigo-100 font-sans">لقد وصلت لآخر كلمة في هذه المجموعة!</span>
              </div>
              
              {isCurrentWordFullyCompleted ? (
                <a 
                  href="https://www.effectivecpmnetwork.com/ktczatvrx?key=73981497b63984cc0d895e217c1ce2e2"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    // Open and trigger the actual level progression in the parent app
                    setTimeout(() => {
                      handleNextWord();
                    }, 800);
                  }}
                  className="inline-flex w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 text-center flex items-center justify-center gap-2 border border-amber-300 relative overflow-hidden group cursor-pointer animate-pulse"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <span>🚀 اكمل لننتقل إلى المستوى التالي</span>
                </a>
              ) : (
                <div 
                  className="w-full py-3.5 px-4 bg-slate-100/10 text-slate-300 font-bold rounded-xl text-xs border border-white/10 cursor-not-allowed text-center"
                >
                  🔒 اكمل لننتقل إلى المستوى التالي (يرجى التدرب أولاً)
                </div>
              )}

              {!isCurrentWordFullyCompleted && (
                <p className="text-[10px] text-pink-200/90 font-bold mt-2">⚠️ يرجى نطق وممارسة كتابة الكلمة الحالية أولاً لتفعيل الانتقال!</p>
              )}
            </div>
          )}

          <div className="w-full flex justify-between items-center bg-white border border-pink-100 rounded-2xl p-4 shadow-sm">
            {/* Previous (السابق) — Left Side of row in RTL layout */}
            <button
              type="button"
              onClick={handlePrevWord}
              disabled={currentWordIndex === 0}
              className="py-3 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-850 hover:text-slate-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-1 active:scale-[0.97]"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            {/* Next (التالي) -> Right Side of row in RTL layout */}
            <button
              type="button"
              onClick={handleNextWord}
              className="py-3 px-5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 shadow-md active:scale-[0.97] cursor-pointer"
            >
              <span>{currentWordIndex === trainingWords.length - 1 ? "اكمل لننتقل إلى المستوى التالي 🎓" : "التالي"}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Guidelines hint for completion before moving forward, shown only when student attempts next and is incomplete */}
          {showCompletionWarning && (
            <p className="text-center text-[10.5px] font-black text-rose-600 bg-rose-50/50 border border-rose-200/35 rounded-xl py-2 px-4 max-w-sm mx-auto animate-fadeIn select-none">
              ⚠️ للمتابعة اكمل جميع انواع التدريبات (سماعاً 🔊، كتابةً ✍️، نطقاً 🎙️)
            </p>
          )}
        </div>

      </div>
    );
  }

  return (
    <div className="w-full text-right animate-fadeIn" dir="rtl">

      {/* 🔍 REAL-TIME DYNAMIC GROUP SEARCH BLOCK */}
      <div className="max-w-md mx-auto mb-6 px-3" id="group-search-card">
        <div className="bg-white rounded-[26px] p-5 border border-pink-100 shadow-[0_10px_35px_rgba(236,72,153,0.04)] space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-pink-50">
            <span className="text-2xl">🔍</span>
            <div className="text-right">
              <h4 className="text-xs font-black text-slate-900">البحث السريع عن المجموعات</h4>
              <p className="text-[10px] text-slate-450 font-bold">حتى لو كتبت كلمة واحدة، ستظهر المجموعات المطابقة فوراً</p>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم المجموعة هنا..."
              className="w-full text-right bg-pink-50/20 hover:bg-pink-50/40 text-slate-850 border border-pink-205 rounded-xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-pink-400 transition-all"
            />
            {groupSearchQuery && (
              <button
                type="button"
                onClick={() => setGroupSearchQuery("")}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-black text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results */}
          {groupSearchQuery.trim() !== "" && (
            <div className="space-y-2 mt-2 animate-fadeIn">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-black px-1">
                <span>المجموعات المكتشفة ({groupMatchingWordsResults.length})</span>
                {groupMatchingWordsResults.length === 0 && <span>لم نجد أي مـجموعة مطابقة</span>}
              </div>

              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-0.5">
                {groupMatchingWordsResults.map((item) => {
                  const isUnlocked = isGroupSequenceUnlocked(item.key);
                  const isCompleted = completedGroups.includes(item.key);

                  return (
                    <div 
                      key={item.key} 
                      className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                        isUnlocked 
                          ? "bg-pink-50/40 border-pink-100 hover:bg-pink-50/80 hover:border-pink-200" 
                          : "bg-slate-50/80 border-slate-150"
                      }`}
                    >
                      {/* Left Block -> action triggers directly if unlocked or locks display */}
                      <div className="flex items-center gap-2">
                        {isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              const lvlObj = LEARNING_LEVELS.find(l => l.number === item.level);
                              if (lvlObj) {
                                setActiveTrainingLevel(lvlObj);
                                setActiveTrainingSemester(item.semester);
                                setActiveTrainingGroup(item.group);
                                setCurrentWordIndex(0);
                              }
                            }}
                            className="bg-pink-500 hover:bg-pink-600 text-white font-black text-[11px] py-1.5 px-3.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm shadow-pink-100"
                          >
                            تأسيس وبدء 🔓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const idxInAll = allSortedGroups.findIndex(g => g.key === item.key);
                              if (idxInAll > 0) {
                                const prevGroup = allSortedGroups[idxInAll - 1];
                                alert(`⚠️ هذه المجموعة مغلقة! يجب عليك إنهاء المجموعة السابقة "${prevGroup.group}" أولاً لتتمكن من فتحها.`);
                              } else {
                                alert("⚠️ هذه المجموعة مغلقة حالياً.");
                              }
                            }}
                            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-500 rounded-xl p-2 shrink-0 cursor-pointer active:scale-95"
                            title="انقر لمعرفة سبب القفل"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Right Block -> name and metadata metadata constraints */}
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-1.5 justify-end">
                          {isCompleted && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black">جاهز ✓</span>}
                          <h5 className="text-xs font-black text-slate-800">{item.group}</h5>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end text-[9px] text-slate-500 font-bold">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">{item.semester}</span>
                          <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded select-none">المستوى {item.level}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 📊 STATS CARDS: COMPLETED WORDS & CURRENT SEMESTER (SQUARE BOXES NEXT TO EACH OTHER) */}
      <div className="max-w-md mx-auto mb-6 px-3" id="completed-words-semester-counter-grid" dir="rtl">
        <div className="grid grid-cols-2 gap-4">
          
          {/* Words Count Box */}
          <div className="bg-white rounded-3xl border border-pink-100/95 hover:border-pink-200 transition-all shadow-[0_8px_30px_rgb(236,72,153,0.03)] p-4 flex flex-col items-center justify-center text-center select-none min-h-[130px]">
            <div className="text-3xl mb-1.5 filter drop-shadow">📝</div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-black text-slate-400 tracking-wide">الكلمات المنجزة</span>
              <div className="text-3xl font-extrabold font-sans text-purple-950 flex items-baseline justify-center gap-1">
                <span>{completedWordsCount}</span>
                <span className="text-xs text-pink-500 font-extrabold">كلمة</span>
              </div>
            </div>
          </div>

          {/* Semester Box */}
          <div className="bg-white rounded-3xl border border-sky-100/95 hover:border-sky-200 transition-all shadow-[0_8px_30px_rgb(56,189,248,0.03)] p-4 flex flex-col items-center justify-center text-center select-none min-h-[130px]">
            <div className="text-3xl mb-1.5 filter drop-shadow">📅</div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-black text-slate-400 tracking-wide">الترم الدراسي</span>
              <div className="text-sm font-black text-sky-950 leading-tight">
                {studentSemester}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* PWA INSTALL ACTION BANNER */}
      {showInstallBanner && (
        <div className="max-w-md mx-auto mb-4 px-3 animate-fadeIn" dir="rtl">
          <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 rounded-2xl p-4 text-white shadow-lg border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden">
            <div className="absolute top-[-30%] left-[-10%] w-24 h-24 bg-pink-400/20 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 border border-white/20 shadow-sm shrink-0">
                <img 
                  src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/d50e6c29754ea11612492e06c68b3513b20af0f5/file_00000000350071f4a16cedee12520267~3.png" 
                  alt="StitchLab Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-black text-white">ثبّت تطبيق StitchLab على هاتف الموبايل 📲</h4>
                <p className="text-[10px] text-purple-100 font-semibold leading-relaxed">
                  احصل على أفضل تجربة تعليمية متوافقة بالكامل مع تطبيق متجر Google Play!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-white hover:bg-pink-50 text-purple-700 text-[11px] font-black py-2 px-3.5 rounded-xl transition-all shadow active:scale-95 cursor-pointer"
              >
                تثبيت التطبيق
              </button>
              <button
                type="button"
                onClick={() => setShowInstallBanner(false)}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer text-xs"
                title="تجاهل"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Road Map Tablet Frame with elegant modern sapphire blue & white styling and clean borders */}
      <div className="bg-white rounded-[36px] shadow-[0_25px_60px_rgba(236,72,153,0.06),0_1px_3px_rgba(0,0,0,0.02)] border border-pink-100/40 p-6 max-w-md mx-auto relative overflow-hidden">
        
        {/* Absolute settings icon to keep UI perfectly clean but still functional for configs (admin only) */}
        {typeof window !== "undefined" && window.location.search.includes("admin=true") && (
          <button
            type="button"
            onClick={() => setShowConfig(true)}
            className="absolute top-4 left-4 p-1.5 rounded-full text-slate-400 hover:text-purple-600 hover:bg-slate-150 transition-all cursor-pointer z-20"
            title="إعدادات ورقة قوقل"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        )}

        {/* Beautiful motivational heading above the grid */}
        <div className="text-center mb-2 mt-2 select-none">
          <span className="text-[13px] font-black text-purple-700 bg-pink-50/50 border border-pink-100/40 px-5 py-2 rounded-full inline-block tracking-wide shadow-sm">
            هيا نتعلم لنبني المستقبل ✨
          </span>
        </div>

        {/* Dynamic interactive notice box when clicking buttons */}
        <div className="h-11 my-2 flex items-center justify-center text-center">
          {lockedLevelNotice ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-805 text-[11px] font-black px-4 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm animate-bounce">
              <span>⚠️ عذراً! المستوى {lockedLevelNotice} مقفل حالياً. أكمل المستوى {lockedLevelNotice - 1} أولاً لفتحه! 🔒</span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 font-bold bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-2xl">
              🎯 اضغط على أرقام المستويات في المسار لبدء التحدي والتعلم
            </div>
          )}
        </div>

        {/* 3x3 Levels Grid Container - Sleek premium matte gray flat panel */}
        <div className="aspect-square w-full max-w-[340px] mx-auto bg-slate-200/60 border border-slate-300 rounded-[30px] p-5.5 grid grid-cols-3 gap-4.5 relative shadow-inner shadow-slate-300/30">
          {LEARNING_LEVELS.map((level) => {
            const isUnlocked = level.number <= unlockedLevel;
            const isCompleted = completedLevels.includes(level.number);
            
            let btnStyle = "";
            if (isUnlocked) {
              if (isCompleted) {
                // Highly elegant circular glass design for completed buttons (soft glass with green check dot)
                btnStyle = "bg-white/45 backdrop-blur-md border border-white/70 text-slate-800 shadow-[0_8px_32px_0_rgba(15,23,42,0.06)] cursor-pointer hover:bg-white/60 active:scale-95 hover:scale-105 transition-all duration-150";
              } else {
                // Highly elegant circular glass design for active buttons (ambient mauve/pink soft glass)
                btnStyle = "bg-pink-500/25 backdrop-blur-md border border-pink-400/65 text-purple-900 shadow-[0_8px_32px_0_rgba(236,72,153,0.12)] cursor-pointer hover:bg-pink-500/35 active:scale-95 hover:scale-105 transition-all duration-150 font-black";
              }
            } else {
              // Highly elegant circular glass design for locked buttons (soft blurred glassy lock card with lock symbol)
              btnStyle = "bg-slate-100/60 backdrop-blur-sm border border-slate-250 text-slate-450 shadow-sm hover:border-slate-300 hover:bg-slate-250/50 transition-all duration-150 active:scale-95";
            }

            return (
              <button
                key={level.number}
                type="button"
                onClick={() => {
                  if (isUnlocked) {
                    setSelectedLevel(level);
                  } else {
                    // Trigger the interactive locked level warning message
                    setLockedLevelNotice(level.number);
                    // Clear after 3 seconds
                    setTimeout(() => {
                      setLockedLevelNotice(prev => prev === level.number ? null : prev);
                    }, 3000);
                  }
                }}
                className={`group relative rounded-full aspect-square w-full flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-150 ${btnStyle}`}
              >
                {/* Level Big Number */}
                <span className={`text-3xl font-extrabold tracking-tight font-sans transition-all ${!isUnlocked ? "opacity-35" : "group-hover:scale-110"}`}>
                  {level.number}
                </span>

                {/* Lock icon representing the level constraint */}
                {!isUnlocked && (
                  <span className="absolute bottom-1.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-full p-1.5 shadow-sm transform scale-90 duration-150 group-hover:scale-110">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}

                {/* Completed Indicator Dot */}
                {isUnlocked && isCompleted && (
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white shadow-sm animate-pulse" />
                )}

                {/* Current Active Indicator */}
                {isUnlocked && !isCompleted && level.number === unlockedLevel && (
                  <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>



      {/* GOOGLE SHEETS CONFIG MODAL */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 shadow-2xl overflow-hidden text-right leading-relaxed" dir="rtl">
            <div className="p-5 text-white bg-slate-900 flex justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black">ربط المصادر الخارجية 📊</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                اربط ملف قوقل شيت وسحب الكلمات والروابط بشكل فوري. يرجى تهيئة الملف كـ "عام للجميع كـ عارض" للوصول السلس.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 block">رابط أو رمز الورقة (URL / ID):</label>
                <input
                  type="text"
                  value={sheetLinkInput}
                  onChange={(e) => setSheetLinkInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  dir="ltr"
                />
              </div>

              {syncError && (
                <span className="text-xs text-rose-500 bg-rose-50/50 p-2.5 rounded-xl block font-bold leading-normal">
                  ⚠️ {syncError}
                </span>
              )}

              {syncSuccess && (
                <span className="text-xs text-emerald-600 bg-emerald-50/10 p-2.5 rounded-xl block font-bold leading-normal">
                  ✓ تم جلب وتعبئة {sheetWords.length} كارت بنجاح!
                </span>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSyncGoogleSheet}
                  disabled={syncLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-white font-extrabold flex items-center justify-center gap-1 active:scale-95"
                >
                  {syncLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري المعالجة...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>تحديث البيانات 📥</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleLoadDemoSheet}
                  className="px-4 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold"
                >
                  الافتراضي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED ROADMAP LEVEL CHALLENGE MODAL */}
      {selectedLevel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-[28px] w-full max-w-sm border border-pink-100 shadow-2xl overflow-hidden text-right leading-relaxed">
            
            {/* Modal Header */}
            <div className="p-5 px-6 border-b border-pink-50 flex justify-between items-center bg-white">
              <h3 className="text-sm font-black text-purple-900">اختر التفاصيل للمستوى {selectedLevel.number}</h3>
              <button
                type="button"
                onClick={() => setSelectedLevel(null)}
                className="w-8 h-8 rounded-full bg-pink-50/50 hover:bg-pink-100 text-pink-500 hover:text-purple-750 flex items-center justify-center transition-all border border-pink-100/30 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 bg-gradient-to-b from-white to-pink-50/10">
              
              <div className="space-y-4">
                {/* Semester Option */}
                <div className="space-y-1.5 text-right">
                  <label className="text-[11px] font-bold text-purple-700 block">
                    الفصل الدراسي
                  </label>
                  <select
                    value={modalSemester}
                    onChange={(e) => {
                      const val = e.target.value;
                      setModalSemester(val);
                      setModalGroup("");
                    }}
                    className="w-full bg-white text-xs font-bold text-slate-800 border border-slate-200/80 rounded-xl p-3 focus:outline-none focus:border-purple-500 cursor-pointer text-right shadow-sm hover:bg-slate-50/50 transition-all font-sans"
                  >
                    <option value="">-- اختر الفصل الدراسي --</option>
                    {uniqueSemestersInModal.map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>

                {/* Group Option as Interactive Card-Buttons Grid */}
                <div className="space-y-2 text-right">
                  <label className="text-[11px] font-black text-purple-900 block">
                    اختر المجموعة للتعلم والتدريب
                  </label>
                  {!modalSemester ? (
                    <div className="text-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[11px] text-slate-400 font-bold">
                      ⚠️ يرجى اختيار الترم/الفصل الدراسي لعرد المجموعات
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="modal-groups-scroll-container">
                      {uniqueGroupsInModal.map((grp, idx) => {
                        const groupKey = `${selectedLevel.number}_${modalSemester}_${grp}`;
                        const isUnlocked = isGroupSequenceUnlocked(groupKey);
                        const isCompleted = completedGroups.includes(groupKey);
                        
                        // Student's active group is the first unlocked group that is NOT completed (or falls back to matching first unlocked)
                        const isActiveFrontier = isUnlocked && !isCompleted && 
                          uniqueGroupsInModal.findIndex(g => {
                            const gk = `${selectedLevel.number}_${modalSemester}_${g}`;
                            return isGroupSequenceUnlocked(gk) && !completedGroups.includes(gk);
                          }) === idx;

                        return (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => {
                              if (!isUnlocked) {
                                const idxInAll = allSortedGroups.findIndex(g => g.key === groupKey);
                                if (idxInAll > 0) {
                                  const prevGroup = allSortedGroups[idxInAll - 1];
                                  alert(`⚠️ هذه المجموعة مغلقة! يجب عليك إنهاء المجموعة السابقة "${prevGroup.group}" أولاً لتتمكن من فتحها.`);
                                } else {
                                  alert("⚠️ هذه المجموعة مغلقة حالياً.");
                                }
                                return;
                              }
                              setModalGroup(grp);
                              setActiveTrainingLevel(selectedLevel);
                              setActiveTrainingSemester(modalSemester);
                              setActiveTrainingGroup(grp);
                              setCurrentWordIndex(0);
                              setSelectedLevel(null);
                            }}
                            className={`w-full text-right p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 relative ${
                              isActiveFrontier
                                ? "bg-purple-50/95 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)] ring-2 ring-purple-400 ring-offset-1"
                                : isCompleted
                                ? "bg-pink-50/60 border-pink-100 text-pink-700 hover:bg-pink-100/50"
                                : isUnlocked
                                ? "bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/10 text-slate-800"
                                : "bg-slate-50/80 border-slate-200/50 text-slate-400 opacity-80"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {isCompleted ? "✅" : isUnlocked ? "🎯" : "🔒"}
                              </span>
                              <div className="flex flex-col text-right">
                                <span className={`text-xs font-black ${isActiveFrontier ? "text-purple-950" : ""}`}>
                                  {grp}
                                </span>
                                {isActiveFrontier && (
                                  <span className="text-[9px] text-purple-700 font-extrabold animate-pulse flex items-center gap-1 mt-0.5">
                                    <span>●</span> مجموعتك النشطة حالياً
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isCompleted ? (
                                <span className="text-[9px] bg-pink-100 text-pink-800 font-black px-2 py-0.5 rounded-full border border-pink-200">مكتملة ✨</span>
                              ) : isUnlocked ? (
                                <span className="text-[9px] bg-purple-100 text-purple-800 font-black px-2 py-0.5 rounded-full border border-purple-250/20">دخول ⚡</span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 text-slate-500 font-black px-2 py-0.5 rounded-full border border-slate-200">
                                  🔒 مغلقة
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Back to Home button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedLevel(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <span>الرجوع للرئيسية ↩️</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* OFFLINE ALERT OVERLAY */}
      {offlineError && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-[28px] max-w-sm w-full border border-purple-150 p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-2xl animate-pulse">
              🚫
            </div>
            <h3 className="text-sm font-black text-slate-800">عذراً! الجهاز غير متصل بالإنترنت</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-bold">
              {offlineError}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setOfflineError(null)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                موافق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADSTERRA ADVERTISER OVERLAY */}



    </div>
  );
}
