import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Send,
  AlertCircle,
  ArrowRight,
  LogOut,
  Mail,
  Lock,
  User,
  Volume2,
  Trash2,
  Compass,
  Trophy,
  Award,
  HelpCircle,
  X,
  Sparkles,
  Copy,
  Settings,
  Cloud
} from "lucide-react";
import { 
  Persona, 
  ChatMessage, 
  Flashcard, 
  PRESET_PERSONAS, 
  DAILY_QUOTES, 
  PRESET_FLASHCARDS,
  playAudioFeedback,
  playButtonClickSound
} from "./components/types";

// Import Firebase architecture & systems
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  handleFirestoreError,
  OperationType
} from "./firebaseClient";
import { 
  doc, 
  getDoc, 
  getDocFromCache,
  setDoc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { findBackupFile, getBackupContent, saveBackup, type BackupPayload } from "./lib/googleDriveService";
import HomeWorkspace from "./components/HomeWorkspace";
import confetti from "canvas-confetti";
import AchievementsWorkspace from "./components/AchievementsWorkspace";
import AboutWorkspace from "./components/AboutWorkspace";
import LearningTimer from "./components/LearningTimer";

// Import newly refactored dynamic panels
import ChatPanel from "./components/ChatPanel";
import AnalyzerPanel from "./components/AnalyzerPanel";
import QuizPanel from "./components/QuizPanel";
import FlashcardsPanel from "./components/FlashcardsPanel";

// Import motion & beautiful custom brand assets
import { motion, AnimatePresence } from "motion/react";
import welcomeRabbit from "./assets/1000000038.webp";

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Global Sound Click Listener for buttons and interactive items
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const clickable = target.closest("button, [role='button'], a, input[type='submit'], input[type='button'], .cursor-pointer, [id*='level-card']") as HTMLElement;
      if (clickable) {
        // Only ignore if clicking nested select elements or textual input boxes to avoid typing sounds.
        const tagName = target.tagName.toLowerCase();
        if (tagName === "input" && (target as HTMLInputElement).type !== "button" && (target as HTMLInputElement).type !== "submit") {
          return;
        }
        if (tagName === "textarea" || tagName === "select") {
          return;
        }
        playButtonClickSound();

        // Make the button vibrate/shake!
        clickable.classList.add("animate-shake");
        setTimeout(() => {
          clickable.classList.remove("animate-shake");
        }, 360);
      }
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, []);

  // Save feedback state for snackbar
  const [saveStatus, setSaveStatus] = useState<{ show: boolean; success: boolean; message: string } | null>(null);

  // Deep-linking capture: store parameter "ref" as the challenger reference
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get("ref") || urlParams.get("v");
      if (refParam) {
        localStorage.setItem("stitchlab_challenger_ref", refParam);
        console.log("StitchLab Deep Link: Stored challenger reference:", refParam);
      }
    } catch (e) {
      console.warn("StitchLab: Failed to parse ref query parameter:", e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 10000); // 10 seconds (شاشة ترحيبية بيضاء لمدة 10 ثوان)
    return () => clearTimeout(timer);
  }, []);

  // Login / Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [userLevel, setUserLevel] = useState<"Beginner" | "Intermediate" | "Advanced">(() => {
    if (typeof window === "undefined") return "Intermediate";
    return (localStorage.getItem("stitchlab_user_level") as any) || "Intermediate";
  });
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; level: string } | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Firestore & Gamification states
  const [points, setPoints] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("stitchlab_points") || "0", 10);
  });
  const [completedGroups, setCompletedGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_completed_groups");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [analyzedCount, setAnalyzedCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("stitchlab_analyzed_count") || "0", 10);
  });
  const [completedWordsCount, setCompletedWordsCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("stitchlab_completed_words_count") || "0", 10);
  });
  const [studentSemester, setStudentSemester] = useState<string>(() => {
    if (typeof window === "undefined") return "الفصل الدراسي الأول";
    return localStorage.getItem("stitchlab_student_semester") || "الفصل الدراسي الأول";
  });
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const isInitialLoad = React.useRef<boolean>(true);

  // Challenge states & modal triggers (Re-ordered after state definitions)
  const [challengeChallenger, setChallengeChallenger] = useState<string | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState<boolean>(false);

  const checkChallenge = React.useCallback(() => {
    try {
      const storedRef = localStorage.getItem("stitchlab_challenger_ref");
      if (!storedRef) return;

      const challengerClean = storedRef.trim();
      const currentUserName = currentUser?.name || auth.currentUser?.displayName || "طالب مميز";
      const currentUserUid = auth.currentUser?.uid;

      // Avoid challenging oneself
      if (
        challengerClean !== "طالب مميز" &&
        challengerClean !== currentUserName &&
        challengerClean !== currentUserUid
      ) {
        // Did user already process this specific challenger's requests?
        const resolvedChallenges = JSON.parse(localStorage.getItem("stitchlab_resolved_challenges") || "[]");
        if (!resolvedChallenges.includes(challengerClean)) {
          setChallengeChallenger(challengerClean);
          setShowChallengeModal(true);
        }
      }
    } catch (e) {
      console.warn("StitchLab checkChallenge failed:", e);
    }
  }, [currentUser]);

  // Invoke checkChallenge whenever the user successfully signs in and client progress loading wraps up
  useEffect(() => {
    if (isLoggedIn && isDataLoaded) {
      // Delay slightly to give page time to render beautifully after loading spinner transitions
      const delayTimer = setTimeout(() => {
        checkChallenge();
      }, 1000);
      return () => clearTimeout(delayTimer);
    }
  }, [isLoggedIn, isDataLoaded, checkChallenge]);

  // Online/Offline, Sync code states & Modals
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof window !== "undefined" ? window.navigator.onLine : true);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [syncInputCode, setSyncInputCode] = useState<string>("");
  const [currentSyncCode, setCurrentSyncCode] = useState<string>("");

  // Google Drive backup states
  const [driveToken, setDriveToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("stitchlab_drive_token") || null;
  });
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [showContinueScreen, setShowContinueScreen] = useState<boolean>(false);
  const [googleSuccessMsg, setGoogleSuccessMsg] = useState<string>("");
  const [isBackupLoading, setIsBackupLoading] = useState<boolean>(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState<boolean>(false);
  const [cloudDriveBackup, setCloudDriveBackup] = useState<{
    id: string;
    modifiedTime?: string;
    level: string;
    points: number;
    updatedAt: string;
  } | null>(null);
  const [showRestoreSuggestion, setShowRestoreSuggestion] = useState<boolean>(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(window.navigator.onLine);
    };
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("stitchlab_completed_words_count", completedWordsCount.toString());
  }, [completedWordsCount]);

  useEffect(() => {
    localStorage.setItem("stitchlab_student_semester", studentSemester);
  }, [studentSemester]);

  // Main UI Tab States
  const [activeTab, setActiveTab] = useState<"chat" | "analyzer" | "quiz" | "flashcards">("chat");

  // Game map state & custom tabs
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    return parseInt(localStorage.getItem("stitchlab_unlocked_level") || "1", 10);
  });
  const [completedLevels, setCompletedLevels] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_completed_levels");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [mainTab, setMainTab] = useState<"home" | "training" | "achievements" | "about" | "certificates" | "support">("home");
  const [currentTickTime, setCurrentTickTime] = useState<string>("14:44");
  const [bonusMinutes, setBonusMinutes] = useState<number>(15);

  // Persistent 45 Minutes Daily Timer System for student users
  const [dailySecondsLeft, setDailySecondsLeft] = useState<number>(() => {
    if (typeof window === "undefined") return 2700;
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("stitchlab_timer_date");
    if (savedDate !== today) {
      localStorage.setItem("stitchlab_timer_date", today);
      localStorage.setItem("stitchlab_seconds_left", "2700");
      localStorage.setItem("stitchlab_extra_ad_claims", "0");
      return 2700;
    } else {
      const savedSecs = localStorage.getItem("stitchlab_seconds_left");
      return savedSecs !== null ? parseInt(savedSecs, 10) : 2700;
    }
  });

  const [extraAdClaimsCount, setExtraAdClaimsCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("stitchlab_timer_date");
    if (savedDate !== today) {
      return 0;
    } else {
      const savedClaims = localStorage.getItem("stitchlab_extra_ad_claims");
      return savedClaims !== null ? parseInt(savedClaims, 10) : 0;
    }
  });

  // List of group keys unlocked via Adsterra ad gating
  const [unlockedAdvertiserGroups, setUnlockedAdvertiserGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_unlocked_ad_groups");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Quote state
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // Statistics state
  const [quizScore, setQuizScore] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("stitchlab_quiz_score") || "0", 10);
  });
  const [quizAttempts, setQuizAttempts] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("stitchlab_quiz_attempts") || "0", 10);
  });
  const [conversationsHad, setConversationsHad] = useState<number>(() => {
    if (typeof window === "undefined") return 4;
    return parseInt(localStorage.getItem("stitchlab_conversations_had") || "4", 10);
  });
  const [customFlashcards, setCustomFlashcards] = useState<Flashcard[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_custom_cards");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Chat parameters
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PRESET_PERSONAS[0]);
  const [chatInputValue, setChatInputValue] = useState<string>("Hello!");
  const [chatHistoryMap, setChatHistoryMap] = useState<Record<string, ChatMessage[]>>({});
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatTranslateToggle, setChatTranslateToggle] = useState<Record<string, boolean>>({});

  // Sentence Analyzer structures
  const [analyzerInputValue, setAnalyzerInputValue] = useState<string>("");
  const [analyzerLoading, setAnalyzerLoading] = useState<boolean>(false);
  const [analyzerResult, setAnalyzerResult] = useState<any | null>(null);
  const [analyzerError, setAnalyzerError] = useState<string>("");

  // Interactive Quiz state
  const [quizTopic, setQuizTopic] = useState<string>("Rules of Prepositions & Tenses");
  const [quizCustomTopic, setQuizCustomTopic] = useState<string>("");
  const [quizLevel, setQuizLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string>("");

  // Flashcards state filters
  const [flashcardSearch, setFlashcardSearch] = useState<string>("");
  const [flashcardLevelFilter, setFlashcardLevelFilter] = useState<string>("All");
  const [newCardWord, setNewCardWord] = useState<string>("");
  const [newCardIpa, setNewCardIpa] = useState<string>("");
  const [newCardPartOfSpeech, setNewCardPartOfSpeech] = useState<string>("Noun");
  const [newCardMeaning, setNewCardMeaning] = useState<string>("");
  const [newCardExample, setNewCardExample] = useState<string>("");
  const [newCardExampleTranslation, setNewCardExampleTranslation] = useState<string>("");
  const [newCardLevel, setNewCardLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [showAddCardModal, setShowAddCardModal] = useState<boolean>(false);

  // Client side Speech Synthesis Voice assistant
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-GB";
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const isMaleVoice = selectedPersona.id === "jack" || selectedPersona.id === "adam";
        const britishVoices = voices.filter(v => 
          v.lang.toLowerCase().includes("gb") || 
          v.lang.toLowerCase().includes("uk") ||
          v.name.toLowerCase().includes("united kingdom") ||
          v.name.toLowerCase().includes("great britain")
        );
        const candidates = britishVoices.length > 0 ? britishVoices : voices;
        const matchedVoice = candidates.find(v => 
          isMaleVoice 
            ? v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("george")
            : v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("hazel") || v.name.toLowerCase().includes("susan")
        ) || candidates[0];
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }
      window.speechSynthesis.speak(utterance);
    } else {
      alert("النطق الصوتي غير مدعوم في متصفحك الحالي.");
    }
  };

  // Tick time and pick daily quote
  useEffect(() => {
    const randIndex = Math.floor(Math.random() * DAILY_QUOTES.length);
    setQuoteIndex(randIndex);

    const savedChatHistory = localStorage.getItem("stitchlab_chat_history_map");
    if (savedChatHistory) {
      try {
        setChatHistoryMap(JSON.parse(savedChatHistory));
      } catch (e) {}
    }

    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours().toString().padStart(2, "0");
      let minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTickTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Sync custom cards changes locally
  useEffect(() => {
    if (customFlashcards.length > 0) {
      localStorage.setItem("stitchlab_custom_cards", JSON.stringify(customFlashcards));
    }
  }, [customFlashcards]);

  // Firebase auth state listener & automatic cloud data sync bootstrap
  useEffect(() => {
    console.log("Loading saved progress...");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);
        setIsDataLoaded(false);
        setAuthLoading(true);
        setAuthError("");
        
        const uid = firebaseUser.uid;
        let progress: any = null;
        
        // A. Read local UID specific progress first
        try {
          const userProgressKey = `stitchlab_student_${uid}_progress`;
          const savedProgressStr = localStorage.getItem(userProgressKey);
          if (savedProgressStr) {
            progress = JSON.parse(savedProgressStr);
          }
        } catch (localErr) {
          console.warn("StitchLab: Failed to read from local storage:", localErr);
        }

        // B. If progress was found in localStorage, restore it!
        if (progress) {
          setUserLevel(progress.level || "Intermediate");
          setPoints(progress.points !== undefined ? progress.points : 0);
          setUnlockedLevel(progress.unlockedLevel || 1);
          setCompletedLevels(progress.completedLevels || []);
          setCompletedGroups(progress.completedGroups || []);
          setCustomFlashcards(progress.customFlashcards || []);
          setConversationsHad(progress.conversationsHad || 0);
          setQuizScore(progress.quizScore || 0);
          setQuizAttempts(progress.quizAttempts || 0);
          setAnalyzedCount(progress.analyzedCount || 0);
          setCompletedWordsCount(progress.completedWordsCount || 0);
          setStudentSemester(progress.studentSemester || "الفصل الدراسي الأول");
          
          setCurrentUser({
            name: progress.name || firebaseUser.displayName || "طالب مميز",
            email: firebaseUser.email || "",
            level: progress.level || "Intermediate"
          });
          console.log("Progress restored successfully.");
          console.log(`[StitchLab Debug] تم استعادة التقدم بنجاح للطالب المسجل. النقاط: ${progress.points || 0}، المستوى: ${progress.level || "Intermediate"}، الكلمات: ${progress.completedWordsCount || 0}`);
        } else {
          // C. Warm-start fallback: Link previous offline guest / general progress to this user!
          const localUserLevel = localStorage.getItem("stitchlab_user_level") as any || "Intermediate";
          const localPoints = parseInt(localStorage.getItem("stitchlab_points") || "0", 10);
          const localUnlockedLevel = parseInt(localStorage.getItem("stitchlab_unlocked_level") || "1", 10);
          const localCompletedLevels = JSON.parse(localStorage.getItem("stitchlab_completed_levels") || "[]");
          const localCompletedGroups = JSON.parse(localStorage.getItem("stitchlab_completed_groups") || "[]");
          const localCustomFlashcards = JSON.parse(localStorage.getItem("stitchlab_custom_cards") || "[]");
          const localConversationsHad = parseInt(localStorage.getItem("stitchlab_conversations_had") || "0", 10);
          const localQuizScore = parseInt(localStorage.getItem("stitchlab_quiz_score") || "0", 10);
          const localQuizAttempts = parseInt(localStorage.getItem("stitchlab_quiz_attempts") || "0", 10);
          const localAnalyzedCount = parseInt(localStorage.getItem("stitchlab_analyzed_count") || "0", 10);
          const localCompletedWordsCount = parseInt(localStorage.getItem("stitchlab_completed_words_count") || "0", 10);
          const localStudentSemester = localStorage.getItem("stitchlab_student_semester") || "الفصل الدراسي الأول";

          const payload = {
            uid,
            name: firebaseUser.displayName || "طالب مميز",
            email: firebaseUser.email || "",
            level: localUserLevel,
            points: localPoints,
            unlockedLevel: localUnlockedLevel,
            completedLevels: localCompletedLevels,
            completedGroups: localCompletedGroups,
            customFlashcards: localCustomFlashcards,
            conversationsHad: localConversationsHad,
            quizScore: localQuizScore,
            quizAttempts: localQuizAttempts,
            analyzedCount: localAnalyzedCount,
            completedWordsCount: localCompletedWordsCount,
            studentSemester: localStudentSemester
          };

          const userProgressKey = `stitchlab_student_${uid}_progress`;
          localStorage.setItem(userProgressKey, JSON.stringify(payload));

          setUserLevel(localUserLevel);
          setPoints(localPoints);
          setUnlockedLevel(localUnlockedLevel);
          setCompletedLevels(localCompletedLevels);
          setCompletedGroups(localCompletedGroups);
          setCustomFlashcards(localCustomFlashcards);
          setConversationsHad(localConversationsHad);
          setQuizScore(localQuizScore);
          setQuizAttempts(localQuizAttempts);
          setAnalyzedCount(localAnalyzedCount);
          setCompletedWordsCount(localCompletedWordsCount);
          setStudentSemester(localStudentSemester);

          setCurrentUser({
            name: payload.name,
            email: payload.email,
            level: localUserLevel
          });
          console.log("Progress restored successfully.");
          console.log(`[StitchLab Debug] تم استعادة التقدم بنجاح (ربط تقدم الزائر بالرئيسي). النقاط: ${localPoints}، المستوى: ${localUserLevel}، الكلمات: ${localCompletedWordsCount}`);
        }
        
        setIsDataLoaded(true);
        setAuthLoading(false);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setDriveToken(null);
        setDriveFileId(null);
        setCloudDriveBackup(null);
        setShowRestoreSuggestion(false);
        
        // Force offline guest cache restoration so guest users are fully active without Google sign-in
        const localUserLevel = localStorage.getItem("stitchlab_user_level") as any || "Intermediate";
        const localPoints = parseInt(localStorage.getItem("stitchlab_points") || "0", 10);
        const localUnlockedLevel = parseInt(localStorage.getItem("stitchlab_unlocked_level") || "1", 10);
        const localCompletedLevels = JSON.parse(localStorage.getItem("stitchlab_completed_levels") || "[]");
        const localCompletedGroups = JSON.parse(localStorage.getItem("stitchlab_completed_groups") || "[]");
        const localCustomFlashcards = JSON.parse(localStorage.getItem("stitchlab_custom_cards") || "[]");
        const localConversationsHad = parseInt(localStorage.getItem("stitchlab_conversations_had") || "0", 10);
        const localQuizScore = parseInt(localStorage.getItem("stitchlab_quiz_score") || "0", 10);
        const localQuizAttempts = parseInt(localStorage.getItem("stitchlab_quiz_attempts") || "0", 10);
        const localAnalyzedCount = parseInt(localStorage.getItem("stitchlab_analyzed_count") || "0", 10);
        const localCompletedWordsCount = parseInt(localStorage.getItem("stitchlab_completed_words_count") || "0", 10);
        const localStudentSemester = localStorage.getItem("stitchlab_student_semester") || "الفصل الدراسي الأول";
        
        setUserLevel(localUserLevel);
        setPoints(localPoints);
        setUnlockedLevel(localUnlockedLevel);
        setCompletedLevels(localCompletedLevels);
        setCompletedGroups(localCompletedGroups);
        setCustomFlashcards(localCustomFlashcards);
        setConversationsHad(localConversationsHad);
        setQuizScore(localQuizScore);
        setQuizAttempts(localQuizAttempts);
        setAnalyzedCount(localAnalyzedCount);
        setCompletedWordsCount(localCompletedWordsCount);
        setStudentSemester(localStudentSemester);
        
        setIsDataLoaded(true);
        setAuthLoading(false);
        console.log("Progress restored successfully.");
        console.log(`[StitchLab Debug] تم استعادة التقدم بنجاح للمستخدم الزائر. النقاط: ${localPoints}، المستوى: ${localUserLevel}، الكلمات: ${localCompletedWordsCount}`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Once data is loaded for the first time, allow detecting any subsequent state mutations as unsaved changes
  useEffect(() => {
    if (isDataLoaded) {
      const t = setTimeout(() => {
        isInitialLoad.current = false;
      }, 100);
      return () => clearTimeout(t);
    } else {
      isInitialLoad.current = true;
      setHasUnsavedChanges(false);
    }
  }, [isDataLoaded]);

  // Check Google Drive for any existing backup
  const checkGoogleDriveForBackup = async (token: string, silent = true) => {
    try {
      console.log("StitchLab Drive: Checking for backup...");
      const file = await findBackupFile(token);
      if (file) {
        setDriveFileId(file.id);
        const backup = await getBackupContent(token, file.id);
        if (backup) {
          const drivePoints = backup.Achievements?.points || 0;
          const driveWords = backup.WordCounter?.completedWordsCount || 0;
          console.log(`StitchLab Drive: Backup found with points: ${drivePoints} (local points: ${points})`);
          
          setCloudDriveBackup({
            id: file.id,
            modifiedTime: file.modifiedTime,
            level: backup.Level,
            points: drivePoints,
            updatedAt: backup.updatedAt || new Date().toISOString()
          });

          // Check if Google Drive backup is newer or has superior progress than local storage
          if (drivePoints > points || driveWords > completedWordsCount) {
            setShowRestoreSuggestion(true);
            if (!silent) {
              console.log("StitchLab Drive: Cloud backup is superior, suggesting restore.");
            }
          }
        }
      } else {
        console.log("StitchLab Drive: No backup file found on Google Drive.");
      }
    } catch (e) {
      console.warn("StitchLab Drive: Error while checking backup:", e);
    }
  };

  // Perform Backup to Google Drive
  const backupToGoogleDriveNow = async (forceToken?: string) => {
    const token = forceToken || driveToken;
    let finalToken = token;
    if (!finalToken) {
      // Prompt sign in popup to get permission token using our custom client-configured OAuth
      try {
        const customToken = await initGoogleDriveOAuth();
        finalToken = customToken;
        setDriveToken(customToken);
        localStorage.setItem("stitchlab_drive_token", customToken);
      } catch (err) {
        console.error("Popup Auth failed:", err);
        alert("⚠️ يرجى تفويض صلاحية الوصول إلى Google Drive لإتمام النسخ الاحتياطي السحابي.");
        return;
      }
    }

    setIsBackupLoading(true);
    try {
      const progressPayload: BackupPayload = {
        Level: userLevel,
        SavedWords: customFlashcards,
        WordCounter: {
          completedWordsCount: completedWordsCount,
          analyzedCount: analyzedCount
        },
        Achievements: {
          points: points,
          unlockedLevel: unlockedLevel,
          completedLevels: completedLevels,
          completedGroups: completedGroups,
          conversationsHad: conversationsHad,
          quizScore: quizScore,
          quizAttempts: quizAttempts,
          studentSemester: studentSemester
        },
        updatedAt: new Date().toISOString()
      };

      // Find file ID if we don't have it yet
      let fileId = driveFileId;
      if (!fileId) {
        const file = await findBackupFile(finalToken);
        if (file) {
          fileId = file.id;
          setDriveFileId(file.id);
        }
      }

      const res = await saveBackup(finalToken, progressPayload, fileId);
      if (res && res.id) {
        setDriveFileId(res.id);
        setHasUnsavedChanges(false);
        // Refresh cloud metadata on success
        setCloudDriveBackup({
          id: res.id,
          level: userLevel,
          points: points,
          updatedAt: progressPayload.updatedAt
        });
        alert("☁️ تم النسخ الاحتياطي التلقائي والمستدام لنقاطك ومستوياتك ومحفظتك إلى Google Drive بنجاح!");
        try { playAudioFeedback(true); } catch (_) {}
      }
    } catch (err: any) {
      console.error("Backup failed:", err);
      alert("❌ عذراً، فشل إجراء النسخ الاحتياطي إلى Google Drive. يرجى تكرار المحاولة.");
    } finally {
      setIsBackupLoading(false);
    }
  };

  // Perform Restore from Google Drive
  const restoreFromGoogleDriveNow = async (forceToken?: string) => {
    const token = forceToken || driveToken;
    let finalToken = token;
    if (!finalToken) {
      try {
        const customToken = await initGoogleDriveOAuth();
        finalToken = customToken;
        setDriveToken(customToken);
        localStorage.setItem("stitchlab_drive_token", customToken);
      } catch (err) {
        console.error("Auth popup failed:", err);
        alert("⚠️ يرجى تفويض صلاحية الوصول إلى حساب Google لإجراء الاستعادة.");
        return;
      }
    }

    setIsRestoreLoading(true);
    try {
      // Find backup file
      const file = await findBackupFile(finalToken);
      if (!file) {
        alert("⚠️ عذراً! لم نجد أي ملفات تقدم دراسي محفوظة مسبقاً لحساب Google هذا على Google Drive.");
        setIsRestoreLoading(false);
        return;
      }

      const backup = await getBackupContent(finalToken, file.id);
      if (backup) {
        // Apply state restorers!
        setUserLevel(backup.Level || "Intermediate");
        setCustomFlashcards(backup.SavedWords || []);
        if (backup.WordCounter) {
          setCompletedWordsCount(backup.WordCounter.completedWordsCount || 0);
          setAnalyzedCount(backup.WordCounter.analyzedCount || 0);
        }
        if (backup.Achievements) {
          setPoints(backup.Achievements.points || 0);
          setUnlockedLevel(backup.Achievements.unlockedLevel || 1);
          setCompletedLevels(backup.Achievements.completedLevels || []);
          setCompletedGroups(backup.Achievements.completedGroups || []);
          setConversationsHad(backup.Achievements.conversationsHad || 0);
          setQuizScore(backup.Achievements.quizScore || 0);
          setQuizAttempts(backup.Achievements.quizAttempts || 0);
          setStudentSemester(backup.Achievements.studentSemester || "الفصل الدراسي الأول");
        }
        
        setHasUnsavedChanges(false);
        setShowRestoreSuggestion(false);
        alert("🎉 تهانينا! تم استعادة جميع الإنجازات ومجلد الكلمات والمستويات بنجاح تام بنقرة واحدة!");
        try { playAudioFeedback(true); } catch (_) {}
      } else {
        alert("❌ قراءة ملف النسخة الاحتياطية فارغة أو غير متوافقة.");
      }
    } catch (err) {
      console.error("Restore failed:", err);
      alert("❌ عذراً، تعذر إنهاء عملية الاستعادة بنقرة واحدة. يرجى المحاولة بشكل لاحق.");
    } finally {
      setIsRestoreLoading(false);
    }
  };

  // Silent automatic Google Drive background backup
  const backupProgressToGoogleDrive = async () => {
    if (!driveToken || !isDataLoaded) return;
    try {
      const progressPayload: BackupPayload = {
        Level: userLevel,
        SavedWords: customFlashcards,
        WordCounter: {
          completedWordsCount: completedWordsCount,
          analyzedCount: analyzedCount
        },
        Achievements: {
          points: points,
          unlockedLevel: unlockedLevel,
          completedLevels: completedLevels,
          completedGroups: completedGroups,
          conversationsHad: conversationsHad,
          quizScore: quizScore,
          quizAttempts: quizAttempts,
          studentSemester: studentSemester
        },
        updatedAt: new Date().toISOString()
      };
      
      const fileId = driveFileId || (await findBackupFile(driveToken))?.id;
      const res = await saveBackup(driveToken, progressPayload, fileId);
      if (res && res.id) {
        setDriveFileId(res.id);
        setHasUnsavedChanges(false);
        console.log("StitchLab Drive: Automatic background cloud backup succeeded ☁️");
      }
    } catch (err) {
      console.warn("StitchLab Drive: Auto background backup failed:", err);
    }
  };

  // Monitor user state edits to set unsaved changes flag and save immediately to localStorage for ultimate safe offline persistence
  useEffect(() => {
    if (!isDataLoaded) return;
    
    console.log("Saving progress...");
    try {
      // Write immediately to memory cache so progress is never lost even if they close without syncing
      localStorage.setItem("stitchlab_user_level", userLevel);
      localStorage.setItem("stitchlab_points", points.toString());
      localStorage.setItem("stitchlab_unlocked_level", unlockedLevel.toString());
      localStorage.setItem("stitchlab_completed_levels", JSON.stringify(completedLevels));
      localStorage.setItem("stitchlab_completed_groups", JSON.stringify(completedGroups));
      localStorage.setItem("stitchlab_custom_cards", JSON.stringify(customFlashcards));
      localStorage.setItem("stitchlab_conversations_had", conversationsHad.toString());
      localStorage.setItem("stitchlab_quiz_score", quizScore.toString());
      localStorage.setItem("stitchlab_quiz_attempts", quizAttempts.toString());
      localStorage.setItem("stitchlab_analyzed_count", analyzedCount.toString());
      localStorage.setItem("stitchlab_completed_words_count", completedWordsCount.toString());
      localStorage.setItem("stitchlab_student_semester", studentSemester);
      
      // If logged in, also immediately update user-specific progress payload in localStorage
      if (isLoggedIn && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const userProgressKey = `stitchlab_student_${uid}_progress`;
        const progressPayload = {
          uid,
          name: currentUser?.name || auth.currentUser.displayName || "طالب مميز",
          email: auth.currentUser.email || "",
          level: userLevel,
          points: points,
          unlockedLevel: unlockedLevel,
          completedLevels: completedLevels,
          completedGroups: completedGroups,
          customFlashcards: customFlashcards,
          conversationsHad: conversationsHad,
          quizScore: quizScore,
          quizAttempts: quizAttempts,
          analyzedCount: analyzedCount,
          completedWordsCount: completedWordsCount,
          studentSemester: studentSemester,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(userProgressKey, JSON.stringify(progressPayload));
      }

      // Verifying if the save succeeded
      const checkPoints = localStorage.getItem("stitchlab_points");
      const checkLevel = localStorage.getItem("stitchlab_user_level");
      if (checkPoints === points.toString() && checkLevel === userLevel) {
        console.log("Progress saved successfully.");
        console.log(`[StitchLab Debug] تم حفظ التقدم بنجاح ومطابقته دائمًا. النقاط: ${points}، المستوى: ${userLevel}، الكلمات المنجزة: ${completedWordsCount}`);
      } else {
        console.warn("StitchLab Debug: Progress written but verification check failed or value mismatched.");
      }
    } catch (saveErr) {
      console.error("StitchLab Debug: Progress save failed in localStorage:", saveErr);
    }

    if (isInitialLoad.current) {
      return;
    }
    
    // Google Drive background backup trigger
    if (isLoggedIn && auth.currentUser && driveToken) {
      setHasUnsavedChanges(true);

      // Debounce Google Drive backups by 5 seconds to avoid over-spamming API limits during interactions
      const timer = setTimeout(() => {
        backupProgressToGoogleDrive();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [
    isLoggedIn,
    isDataLoaded,
    driveToken,
    userLevel, 
    points, 
    unlockedLevel, 
    completedLevels, 
    completedGroups, 
    customFlashcards, 
    conversationsHad, 
    quizScore, 
    quizAttempts, 
    analyzedCount,
    completedWordsCount,
    studentSemester
  ]);

  // Alert student if they try to close the tab without committing their database updates
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "لديك تقدم ومحفظة كلمات غير محفوظة سحابياً في StitchLab. هل تريد المغادرة فعلاً؟";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Study timer: counts down the daily session seconds
  useEffect(() => {
    if (!isLoggedIn || showSplash) return;
    const interval = setInterval(() => {
      setDailySecondsLeft(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        const next = prev - 1;
        localStorage.setItem("stitchlab_seconds_left", next.toString());
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn, showSplash]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const triggerExtraTimeAd = () => {
    if (!navigator.onLine) {
      alert("عذراً، يرجى الاتصال بالإنترنت للحصول على وقت إضافي! 📡");
      return;
    }
    if (extraAdClaimsCount >= 3) {
      alert("عذراً! لقد استهلكت الحد الأقصى للزيادات المجانية المسموح بها اليوم (3 مرات).");
      return;
    }
    
    setDailySecondsLeft(prevSecs => {
      const next = prevSecs + (15 * 60); // +15 mins
      localStorage.setItem("stitchlab_seconds_left", next.toString());
      return next;
    });
    setExtraAdClaimsCount(prevClaims => {
      const next = Math.min(3, prevClaims + 1);
      localStorage.setItem("stitchlab_extra_ad_claims", next.toString());
      return next;
    });
    alert("🎉 مبارك! تمت إضافة 15 دقيقة إضافية بنجاح لمواصلة التعلم.");
  };

  // Custom Google Drive Client-ID & Scopes OAuth popup helper
  const initGoogleDriveOAuth = () => {
    return new Promise<string>((resolve, reject) => {
      const clientId = "658966518868-neujma8ksfqp50jdqq53g42e38st1t80.apps.googleusercontent.com";
      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(scope)}`;

      const width = 600;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      console.log("StitchLab custom OAuth flow: Opening popup with client_id:", clientId);
      const popup = window.open(
        authUrl,
        "google_drive_oauth",
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
      );

      if (!popup) {
        alert("⚠️ تم حجب النافذة المنبثقة! يرجى السماح بالنوافذ المنبثقة لـ StitchLab لتفعيل Google Drive.");
        reject(new Error("Popup blocked"));
        return;
      }

      const messageListener = (event: MessageEvent) => {
        // Validate origin matches current scheme and host
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
          window.removeEventListener('message', messageListener);
          resolve(event.data.token);
        }
      };

      window.addEventListener('message', messageListener);

      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          window.removeEventListener('message', messageListener);
          reject(new Error("Popup closed by student"));
        }
      }, 1000);
    });
  };

  // Handle email login & registration
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, email, password);
      // Immediately after logging in with email, show 'هيا لنكمل' screen
      setShowContinueScreen(true);
    } catch (err: any) {
      console.error("Email login failed:", err);
      let errMsg = "فشل تسجيل الدخول. يرجى التثبت من البريد الإلكتروني وكلمة المرور.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        errMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التثبت والمحاولة مجددًا.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "صيغة البريد الإلكتروني غير صالحة.";
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setAuthError("يرجى ملء جميع الحقول المطلوبة (الاسم، البريد، كلمة المرور).");
      return;
    }
    if (password.length < 6) {
      setAuthError("يجب ألا تقل كلمة المرور عن 6 أحرف.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      // Immediately after registering with email, show 'هيا لنكمل' screen
      setShowContinueScreen(true);
    } catch (err: any) {
      console.error("Email registration failed:", err);
      let errMsg = "فشل إنشاء الحساب. يرجى التثبت من صحة البريد الإلكتروني والمحاولة مرة أخرى.";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "هذا البريد الإلكتروني مستخدم بالفعل وحسابك مسجل مسبقًا.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "صيغة البريد الإلكتروني غير صالحة.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "كلمة المرور ضعيفة جدًا ونقترح اختيار كلمة مرور أقوى.";
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleActivateDrive = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      // Direct OAuth with configured Client ID and Scope
      const token = await initGoogleDriveOAuth();
      setDriveToken(token);
      localStorage.setItem("stitchlab_drive_token", token);
      
      // Attempt to immediately sync backup
      await checkGoogleDriveForBackup(token, false);
      
      setGoogleSuccessMsg("تم تسجيل دخولك بنجاح");
      try { playAudioFeedback(true); } catch (_) {}
      
      setTimeout(() => {
        setIsLoggedIn(true);
        setShowContinueScreen(false);
        setGoogleSuccessMsg("");
      }, 2500);
    } catch (err: any) {
      console.error("Google Drive connection failed:", err);
      setAuthError("لم نتمكن من ربط Google Drive. يرجى المحاولة مرة أخرى للحصول على ميزة الحفظ السحابي التلقائي.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: handle Google Sign-In via Firebase Popup
  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const { GoogleAuthProvider } = await import("firebase/auth");
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveToken(credential.accessToken);
        console.log("StitchLab Drive: Dynamic token acquired upon authentication:", credential.accessToken);
        await checkGoogleDriveForBackup(credential.accessToken, false);
      } else {
        console.warn("StitchLab Drive: Authentication successful but No access credentials returned.");
      }
    } catch (err: any) {
      console.error("Google Sign-In failed:", err);
      const errStr = err.message || "";
      const isUnauthorizedDomain = err.code === "auth/unauthorized-domain" || errStr.includes("auth/unauthorized-domain") || errStr.includes("unauthorized-domain");
      
      if (isUnauthorizedDomain) {
        const currentHost = window.location.hostname;
        setAuthError(
          `⚠️ خطأ: النطاق الحالي (${currentHost}) غير مصرح به في إعدادات Firebase لخدمة تسجيل الدخول بـ Google.\n\n` +
          `لحل هذه المشكلة في ثوانٍ وتفعيل الدخول السريع:\n` +
          `1️⃣ اذهب إلى كونسول Firebase (console.firebase.google.com) لمشروعك "stitchlab-42087".\n` +
          `2️⃣ انتقل إلى زر Authentication 👥 ثم اختر التبويب Settings ⚙️ بالكلية.\n` +
          `3️⃣ من خيار Authorized domains (النطاقات المصرح بها) اضغط على زر "Add domain".\n` +
          `4️⃣ أضف النطاقات التالية:\n` +
          `   • ${currentHost}\n` +
          `   • ais-pre-s3w4brjysehjqipqfcuhgi-220375696903.europe-west2.run.app\n` +
          `   • localhost\n\n` +
          `🔄 بعد الإضافة، قم بإعادة تنشيط الصفحة وحاول تسجيل الدخول مرة أخرى بحساب Google الخاص بك لتفادي العائق!`
        );
      } else if (err.message && err.message.includes("auth/popup-closed-by-user")) {
        setAuthError("تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية. يرجى المحاولة مجددًا.");
      } else {
        setAuthError(err.message || "فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (hasUnsavedChanges) {
        const confirmSave = window.confirm("لديك تقدم لغوي جديد غير محفوظ سحابياً في StitchLab. هل ترغب بحفظه في حسابك قبل تسجيل الخروج لمزامنته؟");
        if (confirmSave) {
          if (driveToken) {
            await backupToGoogleDriveNow();
          } else {
            const uid = auth.currentUser ? auth.currentUser.uid : "guest";
            const progressPayload = {
              uid,
              name: currentUser?.name || auth.currentUser?.displayName || "طالب مميز",
              email: auth.currentUser?.email || "",
              level: userLevel,
              points: points,
              unlockedLevel: unlockedLevel,
              completedLevels: completedLevels,
              completedGroups: completedGroups,
              customFlashcards: customFlashcards,
              conversationsHad: conversationsHad,
              quizScore: quizScore,
              quizAttempts: quizAttempts,
              analyzedCount: analyzedCount,
              completedWordsCount: completedWordsCount,
              studentSemester: studentSemester,
              updatedAt: new Date().toISOString()
            };
            localStorage.setItem(`stitchlab_student_${uid}_progress`, JSON.stringify(progressPayload));
            setHasUnsavedChanges(false);
          }
        }
      }
      await signOut(auth);
      // Clean up session caches
      localStorage.removeItem("stitchlab_user");
      localStorage.removeItem("stitchlab_completed_groups");
      localStorage.removeItem("stitchlab_custom_cards");
      localStorage.removeItem("stitchlab_unlocked_level");
      localStorage.removeItem("stitchlab_completed_levels");
      localStorage.removeItem("stitchlab_analyzed_count");
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Sign out fail:", e);
    }
  };

  const LEARNING_LEVELS = [
    {
      number: 1,
      title: "الترحيب والتعارف الأساسي",
      englishTitle: "Greetings & Small Talk",
      description: "تبادل التحيات الودودة والتعريف عن نفسك واهتماماتك الشخصية واليومية في مدينة لندن الهادئة مع ليندا.",
      bilingualGoal: "الهدف: التحدث بطلاقة لمبادلة التحيات واجتياز كسر الجمود (Ice-breaking).",
      colorClass: "bg-[#f2a2b1] text-white border-[#fbcfe8] shadow-pink-250/20",
      icon: "🌸",
      personaId: "linda",
      vocabTip: "المفردات المفتاحية: Pleasure, Soho, Looking forward to, Cozy cafe"
    },
    {
      number: 2,
      title: "طلب القهوة والحديث في المقاهي",
      englishTitle: "Ordering Coffee & Brunch",
      description: "طلب فنجان من القهوة والحلوى، وإجراء حوار بسيط مع نادلة المقهى سارة في مقهى Sunny Side Brunch بنيويورك.",
      bilingualGoal: "الهدف: صياغة جمل الطلب المهذبة وتركيبات الوجبات الخفيفة والتبادل المالي.",
      colorClass: "bg-[#c0c6f4] text-white border-[#e0e7ff] shadow-indigo-250/20",
      icon: "☕",
      personaId: "sarah",
      vocabTip: "المفردات المفتاحية: Pancakes, Espresso, Sunny-side up, Bill, please"
    },
    {
      number: 3,
      title: "التقديم الوظيفي ومقابلة العمل",
      englishTitle: "Formal Job Interview Prep",
      description: "محاكاة مقابلة توظيف رسمية وشديدة الاحترافية مع جاك لتقييم المهارات وسيرتك الذاتية ومبررات التوظيف.",
      bilingualGoal: "الهدف: إتقان التعبير عن مشاريعك السابقة، وطموحاتك، والمصطلحات المهنية للمبتكرين.",
      colorClass: "bg-[#aadae9] text-slate-800 border-[#e0f2fe] shadow-sky-250/20",
      icon: "💼",
      personaId: "jack",
      vocabTip: "المفردات المفتاحية: Background, Innovation, Team player, Accomplish"
    },
    {
      number: 4,
      title: "عبور جوازات السفر والمطار الدولي",
      englishTitle: "JFK Airport Passport Control",
      description: "الوقوف في نقطة تفتيش جوازات السفر الصارمة مع الضابط آدم بجدية والإجابة على غرض الزيارة ومدة الإقامة بدقة.",
      bilingualGoal: "الهدف: صياغة إجابات واضحة وحازمة حول مستندات السفر، العناوين، والتأشيرات اللغوية.",
      colorClass: "bg-[#cad3be] text-slate-800 border-[#ecfccb] shadow-lime-250/20",
      icon: "✈️",
      personaId: "adam",
      vocabTip: "المفردات المفتاحية: Passport, Leisure, Intended duration, Landing card"
    },
    {
      number: 5,
      title: "الرحلات وحجز الفندق والخدمات",
      englishTitle: "Hotel Checkout & Room Request",
      description: "مكالمة موظف الفندق لطلب ترقية لغرفتك أو الاستفسار عن المرافق ومواعيد الخروج في رحلتك القادمة لبريطانيا.",
      bilingualGoal: "الهدف: ممارسة الطلبات غير المباشرة والتفاوض حول السعر والخدمات المشمولة.",
      colorClass: "bg-[#e9ccd0] text-slate-850 border-[#fce7f3] shadow-fuchsia-250/20",
      icon: "🏨",
      personaId: "linda",
      vocabTip: "المفردات المفتاحية: Reservation, Amenities, Complementary shuttle, Deluxe suite"
    },
    {
      number: 6,
      title: "التطرق للهوايات والأصدقاء بمرح",
      englishTitle: "Leisure Activities & Daily Vibe",
      description: "حوار دافئ حول أسلوب حياتك، الكتب المفضلة، المسلسلات أو الأفلام التي تحب مشاهدتها لرفع عفوية التواصل.",
      bilingualGoal: "الهدف: استخدام الزمن المضارع البسيط والماضي العفوي لوصف مغامراتك ونمطك الخاص.",
      colorClass: "bg-[#bfcaea] text-[#2d3748] border-[#e0e7ff] shadow-indigo-150/40",
      icon: "🎨",
      personaId: "linda",
      vocabTip: "المفردات المفتاحية: Passionate about, Binge-watching, Genre, Outdoor activities"
    },
    {
      number: 7,
      title: "التسوق المالي والنزاعات الفندقية",
      englishTitle: "Shopping & Bill Discrepancies",
      description: "التفاوض اللبق مع سارة حول فاتورة غير صحيحة أو استرجاع منتج تالف بكياسة وكفاءة نحوية ممتازة.",
      bilingualGoal: "الهدف: القدرة على الاعتراض والتعبير عن الرفض اللطيف والتفاوض بلغة راقية.",
      colorClass: "bg-[#adddeb] text-[#1a202c] border-[#e0f2fe] shadow-sky-150/40",
      icon: "🛍️",
      personaId: "sarah",
      vocabTip: "المفردات المفتاحية: Refund, Defective product, Overcharged bill, Policy"
    },
    {
      number: 8,
      title: "شرح الحالات الطارئة والاتصال بالطبيب",
      englishTitle: "Emergency Calls & Dr. Visit",
      description: "محاكاة مكالمة طارئة لوصف عارض صحي بدقة، أو الاستفسار عن العلاج في عيادة أمريكية.",
      bilingualGoal: "الهدف: التعرف على المصطلحات العيادية وطرح أسئلة تفصيلية حول السلامة البدنية.",
      colorClass: "bg-[#d6d9ce] text-[#2d3748] border-[#f1f5f9] shadow-slate-150/40",
      icon: "🩺",
      personaId: "adam",
      vocabTip: "المفردات المفتاحية: Prescription, Symptoms, Sore throat, Appointment slot"
    },
    {
      number: 9,
      title: "التفاوض النهائي وإقناع الإدارة",
      englishTitle: "Persuasion & High-level Negotiation",
      description: "مواجهة جاك للحصول على ترقية أو مناقشة شروط العقد الجديد بهدوء وإقناع لغوي تام باستخدام استراتيجيات دقيقة.",
      bilingualGoal: "الهدف: ممارسة صياغات الإقناع وبناء الحجج الداعمة واجتياز الاعتراضات القيادية.",
      colorClass: "bg-[#eecbd2] text-[#2d3748] border-[#ffe4e6] shadow-rose-150/40",
      icon: "☄️",
      personaId: "jack",
      vocabTip: "المفردات المفتاحية: Leverage, Salary review, Aligns with goals, Career objective"
    }
  ];

  const completeLevel = (lvlNum: number) => {
    if (!completedLevels.includes(lvlNum)) {
      const nextCompleted = [...completedLevels, lvlNum];
      setCompletedLevels(nextCompleted);
      localStorage.setItem("stitchlab_completed_levels", JSON.stringify(nextCompleted));
      
      const nextLvl = Math.min(9, lvlNum + 1);
      if (nextLvl > unlockedLevel) {
        setUnlockedLevel(nextLvl);
        localStorage.setItem("stitchlab_unlocked_level", nextLvl.toString());
      }
    }
  };

  const resetAllLevelsProgress = () => {
    setUnlockedLevel(1);
    setCompletedLevels([]);
    localStorage.setItem("stitchlab_unlocked_level", "1");
    localStorage.setItem("stitchlab_completed_levels", JSON.stringify([]));
  };

  const handleForceSaveProgress = (overrides?: Partial<{
    completedGroups: string[];
    completedWordsCount: number;
    unlockedLevel: number;
    completedLevels: number[];
  }>) => {
    console.log("[StitchLab] Forcing immediate, synchronous save to localStorage...");
    try {
      const finalCompletedGroups = overrides?.completedGroups ?? completedGroups;
      const finalCompletedWordsCount = overrides?.completedWordsCount ?? completedWordsCount;
      const finalUnlockedLevel = overrides?.unlockedLevel ?? unlockedLevel;
      const finalCompletedLevels = overrides?.completedLevels ?? completedLevels;

      localStorage.setItem("stitchlab_completed_groups", JSON.stringify(finalCompletedGroups));
      localStorage.setItem("stitchlab_completed_words_count", finalCompletedWordsCount.toString());
      localStorage.setItem("stitchlab_unlocked_level", finalUnlockedLevel.toString());
      localStorage.setItem("stitchlab_completed_levels", JSON.stringify(finalCompletedLevels));

      localStorage.setItem("stitchlab_user_level", userLevel);
      localStorage.setItem("stitchlab_points", points.toString());
      localStorage.setItem("stitchlab_custom_cards", JSON.stringify(customFlashcards));
      localStorage.setItem("stitchlab_conversations_had", conversationsHad.toString());
      localStorage.setItem("stitchlab_quiz_score", quizScore.toString());
      localStorage.setItem("stitchlab_quiz_attempts", quizAttempts.toString());
      localStorage.setItem("stitchlab_analyzed_count", analyzedCount.toString());
      localStorage.setItem("stitchlab_student_semester", studentSemester);

      if (isLoggedIn && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const userProgressKey = `stitchlab_student_${uid}_progress`;
        const progressPayload = {
          uid,
          name: currentUser?.name || auth.currentUser.displayName || "طالب مميز",
          email: auth.currentUser.email || "",
          level: userLevel,
          points: points,
          unlockedLevel: finalUnlockedLevel,
          completedLevels: finalCompletedLevels,
          completedGroups: finalCompletedGroups,
          customFlashcards: customFlashcards,
          conversationsHad: conversationsHad,
          quizScore: quizScore,
          quizAttempts: quizAttempts,
          analyzedCount: analyzedCount,
          completedWordsCount: finalCompletedWordsCount,
          studentSemester: studentSemester,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(userProgressKey, JSON.stringify(progressPayload));
      }

      // Verify and match saved status
      const checkPoints = localStorage.getItem("stitchlab_points");
      const checkLevel = localStorage.getItem("stitchlab_user_level");
      if (checkPoints === points.toString() && checkLevel === userLevel) {
        console.log("[StitchLab Debug] Forced save completed and verified completely.");
      }
    } catch (err) {
      console.error("[StitchLab Debug] Immediate force-save failed:", err);
    }
  };

  const getActiveChatMessages = (): ChatMessage[] => {
    const history = chatHistoryMap[selectedPersona.id];
    if (history && history.length > 0) {
      return history;
    }
    return [
      {
        id: "starter",
        role: "model",
        text: selectedPersona.starterMessage,
        translation: selectedPersona.starterMessageTranslation,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      }
    ];
  };

  // Send message API caller to Backend Proxy
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputValue.trim() || chatLoading) return;

    const userMsgText = chatInputValue.trim();
    setChatInputValue("");

    const timeString = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      text: userMsgText,
      timestamp: timeString
    };

    const currentMsgs = getActiveChatMessages();
    const updatedMsgs = [...currentMsgs, userMessage];
    const nextHistoryMap = {
      ...chatHistoryMap,
      [selectedPersona.id]: updatedMsgs
    };
    setChatHistoryMap(nextHistoryMap);
    localStorage.setItem("stitchlab_chat_history_map", JSON.stringify(nextHistoryMap));

    setConversationsHad(prev => prev + 1);
    setChatLoading(true);

    try {
      const reqPayload = {
        message: userMsgText,
        history: updatedMsgs.slice(-10).map(m => ({
          role: m.role,
          text: m.text
        })),
        personaId: selectedPersona.id,
        personaName: selectedPersona.name,
        personaDescription: selectedPersona.role,
        userLevel: userLevel
      };

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqPayload)
      });

      if (!response.ok) {
        throw new Error("فشل في استلام رد ذكي من خادم stitchLab");
      }

      const rawData = await response.json();
      
      const botMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        text: rawData.reply || "I didn't quite catch that. Let's try again!",
        translation: rawData.arabicTranslation,
        feedback: rawData.feedback,
        vocabularySuggestions: rawData.vocabularySuggestions,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      };

      const finalMsgs = [...updatedMsgs, botMessage];
      const finalHistoryMap = {
        ...chatHistoryMap,
        [selectedPersona.id]: finalMsgs
      };
      setChatHistoryMap(finalHistoryMap);
      localStorage.setItem("stitchlab_chat_history_map", JSON.stringify(finalHistoryMap));
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        text: "I am having trouble connecting to the network right now. Could you check again later?",
        translation: "أواجه صعوبة مؤقتة في ربط الخوادم الشبكية. يرجى إعادة المحاولة.",
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      };
      const finalMsgs = [...updatedMsgs, errorMsg];
      const finalHistoryMap = {
        ...chatHistoryMap,
        [selectedPersona.id]: finalMsgs
      };
      setChatHistoryMap(finalHistoryMap);
    } finally {
      setChatLoading(false);
    }
  };

  const clearChatHistory = () => {
    const finalHistoryMap = {
      ...chatHistoryMap,
      [selectedPersona.id]: []
    };
    setChatHistoryMap(finalHistoryMap);
    localStorage.setItem("stitchlab_chat_history_map", JSON.stringify(finalHistoryMap));
  };

  // Sentence dissecetion API trigger
  const handleAnalyzeSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analyzerInputValue.trim() || analyzerLoading) return;

    setAnalyzerLoading(true);
    setAnalyzerError("");
    setAnalyzerResult(null);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: analyzerInputValue })
      });

      if (!response.ok) {
        throw new Error("فشل الخادم في تشريح الجملة المدخلة.");
      }

      const resData = await response.json();
      setAnalyzerResult(resData);
      
      // Increment the analyzed count for achievements tracking
      try {
        const curCount = parseInt(localStorage.getItem("stitchlab_analyzed_count") || "0", 10);
        localStorage.setItem("stitchlab_analyzed_count", (curCount + 1).toString());
      } catch (err) {}
    } catch (e: any) {
      setAnalyzerError(e.message || "عفواً، فشل الاتصال بمحلل القواعد الاصطناعي.");
    } finally {
      setAnalyzerLoading(false);
    }
  };

  const handleQuickPaste = (phrase: string, target: "chat" | "analyzer") => {
    if (target === "chat") {
      setChatInputValue(phrase);
    } else {
      setAnalyzerInputValue(phrase);
    }
  };

  // Quiz submission triggering
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizLoading(true);
    setQuizError("");
    setSubmittedQuiz(false);
    setSelectedAnswers({});
    setQuizQuestions([]);

    const selectedTopic = quizCustomTopic.trim() || quizTopic;

    try {
      const response = await fetch("/api/gemini/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic,
          level: quizLevel
        })
      });

      if (!response.ok) {
        throw new Error("تعذر جلب أسئلة الاختبار التفاعلية.");
      }

      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setQuizAttempts(prev => prev + 1);
      } else {
        throw new Error("لم ترجع الصيغة بهيئة سليمة. حاول مرة أخرى.");
      }
    } catch (err: any) {
      setQuizError(err.message || "حدث خطأ غير متوقع أثناء توليد الاختبار.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectAnswer = (qIndex: number, optionIndex: number) => {
    if (submittedQuiz) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIndex]: optionIndex
    }));
  };

  const handleGradeQuiz = () => {
    if (Object.keys(selectedAnswers).length < quizQuestions.length) {
      alert("الرجاء الإجابة على جميع الأسئلة لتصحيح النتيجة!");
      return;
    }
    
    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / quizQuestions.length) * 100);
    setQuizScore(prev => Math.max(prev, scorePercent));
    setSubmittedQuiz(true);

    // Play immediate audio check (Great job or Try again) based on target score threshold
    if (scorePercent >= 70) {
      playAudioFeedback(true);
    } else {
      playAudioFeedback(false);
    }
  };

  // Add custom vocabulary deck Flashcard
  const handleAddFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardWord.trim() || !newCardMeaning.trim() || !newCardExample.trim()) {
      alert("الطلب يحتاج الكلمة، المعنى بالعربية ومثال توضيحي لإضافتها!");
      return;
    }

    const uniqueId = "custom-" + Math.random().toString(36).substring(7);
    const newCard: Flashcard = {
      id: uniqueId,
      word: newCardWord.trim(),
      ipa: newCardIpa.trim() || "/.../",
      partOfSpeech: newCardPartOfSpeech,
      meaning: newCardMeaning.trim(),
      example: newCardExample.trim(),
      exampleTranslation: newCardExampleTranslation.trim() || "ترجمة المثال متوفرة كمرجع تلقائي للقارئ.",
      level: newCardLevel
    };

    setCustomFlashcards(prev => [newCard, ...prev]);
    
    setNewCardWord("");
    setNewCardIpa("");
    setNewCardMeaning("");
    setNewCardExample("");
    setNewCardExampleTranslation("");
    setShowAddCardModal(false);
  };

  const deleteCustomFlashcard = (id: string) => {
    setCustomFlashcards(prev => prev.filter(c => c.id !== id));
  };

  const allFlashcards = [...customFlashcards, ...PRESET_FLASHCARDS];

  const filteredFlashcards = allFlashcards.filter((card) => {
    const matchesLevel = flashcardLevelFilter === "All" || card.level === flashcardLevelFilter;
    const matchesSearch = 
      card.word.toLowerCase().includes(flashcardSearch.toLowerCase()) ||
      card.meaning.includes(flashcardSearch) ||
      card.example.toLowerCase().includes(flashcardSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  if (showSplash) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-[#FFF0F3] via-[#FFE3E8] to-[#FFD6DC] text-slate-800 text-center select-none font-sans relative overflow-hidden" dir="rtl">
        {/* Ambient background blur elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-md w-full relative z-10 space-y-6">
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-36 h-36 rounded-[40px] bg-white border border-pink-100 shadow-2xl overflow-hidden p-2.5 mx-auto">
              <img 
                src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" 
                alt="StitchLab Logo" 
                referrerPolicy="no-referrer" 
                className="w-full h-full object-contain rounded-[32px]" 
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tight font-sans">
                <span className="text-purple-600">Stitch</span>
                <span className="text-pink-500">Lab</span>
              </h1>
            </div>
            {/* Progress Bar Indicator for 10 seconds */}
            <div className="w-56 h-2 md:h-2.5 bg-pink-100/60 mx-auto rounded-full overflow-hidden relative border border-pink-200/50">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 10, ease: "linear" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-[#FFF0F3] via-[#FFE3E8] to-[#FFD6DC] text-slate-800 text-center select-none font-sans" dir="rtl">
        <div className="bg-white/90 backdrop-blur-md rounded-[32px] border border-pink-200/60 p-8 max-w-sm w-full shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-[24px] flex items-center justify-center mx-auto border border-rose-200/50 text-4xl animate-bounce">
            📶
          </div>
          <h2 className="text-2xl font-black text-purple-950">انقطع الاتصال بالإنترنت!</h2>
          <p className="text-sm font-bold text-slate-600 leading-relaxed">
            يرجى التأكد من اتصالك بالإنترنت لمتابعة رحلتك التعليمية
          </p>
          <button 
            type="button"
            onClick={() => setIsOnline(window.navigator.onLine)} 
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-2xl font-extrabold transition-all shadow-md active:scale-95 text-xs cursor-pointer"
          >
            إعادة المحاولة 🔄
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="stitchlab-main" className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-purple-500 selection:text-white" dir="rtl">
      
      {/* 1. NOT LOGGED IN LAYOUT / OR LOADING SATELLITE */}
      {showContinueScreen ? (
        <div id="stitchlab-continue-step" className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-pink-50 via-[#FFF9FB] to-purple-50 text-slate-800 relative overflow-hidden" dir="rtl">
          {/* Ambient luminous flows */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="w-full max-w-md space-y-6 relative z-10 text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white border border-pink-100 shadow-xl overflow-hidden mb-2 p-1.5 animate-bounce">
                <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
              </div>
              <h1 id="continue-heading" className="text-4xl font-extrabold text-purple-950 tracking-tight">
                هيا لنكمل 🚀
              </h1>
              <p className="text-xs text-purple-900/80 font-bold">
                لتفعيل ميزة المزامنة السحابية والحفظ التلقائي لتقدمك
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-[32px] border border-pink-100/50 p-6 md:p-8 shadow-[0_25px_60px_rgba(236,72,153,0.06)] space-y-6 text-center">
              <p className="text-xs leading-relaxed text-slate-600 font-bold">
                لقد قمت بتسجيل الدخول بنجاح! لتبقى مهاراتك ونقاطك التفاعلية ومحفظة الكلمات محفوظة وآمنة دائمًا، يرجى تفعيل الاتصال بحساب Google Drive الخاص بك.
              </p>

              {authError && (
                <div className="p-4 mb-4 rounded-2xl text-xs bg-rose-50 border border-rose-150 text-rose-800 flex items-start gap-2 text-right" dir="rtl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium flex-1">{authError}</div>
                </div>
              )}

              {googleSuccessMsg ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-center text-xs font-black animate-pulse flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">✓</div>
                  <span>{googleSuccessMsg} 🌸</span>
                </div>
              ) : (
                <button
                  onClick={handleActivateDrive}
                  disabled={authLoading}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-lg active:scale-95 hover:shadow-purple-500/10 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                      <span>جاري تشغيل الاتصال السحابي...</span>
                    </span>
                  ) : (
                    <>
                      <Cloud className="w-5 h-5 shrink-0" />
                      <span>تنشيط Google Drive ☁️</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsLoggedIn(true);
                  setShowContinueScreen(false);
                }}
                className="w-full py-2.5 text-[11px] text-slate-400 hover:text-slate-600 font-bold transition-all underline cursor-pointer"
              >
                تخطي المزامنة والدخول الآن 🎓
              </button>
            </div>
          </div>
        </div>
      ) : !isLoggedIn ? (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-pink-50 via-[#FFF9FB] to-purple-50 text-slate-800 relative overflow-hidden">
          
          {/* Ambient luminous flows for modern feel */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="w-full max-w-md space-y-6 relative z-10">
            
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white border border-pink-100 shadow-xl overflow-hidden mb-2 p-1.5 animate-fadeIn">
                <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
              </div>
              <h1 id="stitchlab-brand-heading" className="text-5xl font-extrabold tracking-tight">
                <span className="text-purple-600 font-extrabold">Stitch</span>
                <span className="text-pink-500 font-black">Lab</span>
              </h1>
              <p className="text-xs text-purple-900/80 font-bold tracking-wide antialiased">
                المختبر والمدرب التفاعلي الذكي للتحدث بطلاقة
              </p>
              <div className="w-20 h-1 bg-gradient-to-r from-purple-600 to-pink-500 mx-auto rounded-full mt-4"></div>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-[32px] border border-pink-100/50 p-6 md:p-8 shadow-[0_25px_60px_rgba(236,72,153,0.06)] relative overflow-hidden space-y-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="text-center space-y-1">
                <span className="text-xs bg-purple-100 text-purple-950 font-black px-3.5 py-1.5 rounded-full border border-purple-200 inline-block">
                  بوابة الطالب الذكية 🎓
                </span>
                <p className="text-[11px] text-slate-400 font-bold pt-1.5">
                  أهلاً بك في فضاء التدريب التفاعلي على اللغة الإنجليزية.
                </p>
              </div>

              {/* Selector Tabs (Login / Sign Up) */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                  className={`flex-1 py-2.5 text-center text-xs font-black transition-all rounded-xl cursor-pointer ${
                    authMode === "login"
                      ? "bg-white text-purple-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🗝️ تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError("");
                  }}
                  className={`flex-1 py-2.5 text-center text-xs font-black transition-all rounded-xl cursor-pointer ${
                    authMode === "signup"
                      ? "bg-white text-purple-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ➕ حساب جديد
                </button>
              </div>

              {authError && (
                <div className="p-4 rounded-2xl text-xs bg-rose-50 border border-rose-150 text-rose-800 flex items-start gap-2 text-right" dir="rtl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-bold flex-1">{authError}</div>
                </div>
              )}

              {/* Form implementation */}
              <form onSubmit={authMode === "login" ? handleEmailSignIn : handleEmailSignUp} className="space-y-3">
                {authMode === "signup" && (
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1 block">الاسم الشخصي واللقب ✏️</label>
                    <input
                      type="text"
                      required
                      placeholder="عبدالله محمد"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-400 outline-none transition-all text-right"
                    />
                  </div>
                )}

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-black text-slate-500 mr-1 block">البريد الإلكتروني ✉️</label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-400 outline-none transition-all text-right"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-black text-slate-500 mr-1 block">كلمة المرور 🔒</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-400 outline-none transition-all text-right"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-3 py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-md hover:shadow-purple-500/15 transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  ) : authMode === "login" ? (
                    "دخول للمختبر 🗝️"
                  ) : (
                    "إنشاء الحساب والمتابعة 🎯"
                  )}
                </button>
              </form>

              {/* Separator line */}
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 py-1">
                <hr className="flex-1 border-slate-200" />
                <span>أو الدخول بـ Google</span>
                <hr className="flex-1 border-slate-200" />
              </div>

              {/* Standard Google Sign-In */}
              <button
                id="submit-google-login-btn"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold rounded-2xl text-xs shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>متابعة باستخدام حساب Google</span>
              </button>

              <div className="pt-1 flex justify-center items-center">
                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  تشفير آمن بنسبة 100% 🔒
                </span>
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-500 font-bold font-sans">
              يتم تشفير وحفظ تقدّمك بكافة الأجهزة تلقائيًا عبر حسابك على Google.
            </p>
          </div>
        </div>
      ) : isLoggedIn && !isDataLoaded ? (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-[#FFF9FB] to-purple-50 text-slate-800" dir="rtl">
          <div className="text-center space-y-4 animate-fadeIn">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
              <span className="absolute inset-0 flex items-center justify-center text-xl">🎓</span>
            </div>
          </div>
        </div>
      ) : (
        /* 2. LOGGED IN DASHBOARD WORKSPACE */
        <div id="stitchlab-workspace" className="flex flex-col min-h-screen bg-gradient-to-br from-[#FFF0F3] via-[#FFE3E8] to-[#FFD6DC] text-slate-900 antialiased font-sans relative overflow-hidden">
          
          {/* REGULAR STUDY INTERACTIVE DASHBOARD VIEW */}
          <>
              <header className="border-b border-pink-100 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3.5 shadow-[0_12px_35px_rgba(236,72,153,0.03)] relative z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-pink-100 shadow-sm overflow-hidden p-0.5 flex-shrink-0 select-none">
                       <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h1 className="font-sans font-black text-xl tracking-tight">
                        <span className="text-purple-600 font-extrabold">Stitch</span>
                        <span className="text-pink-500 font-black">Lab</span>
                      </h1>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">




                    
                    <div className="flex flex-col items-start sm:items-end text-slate-700 gap-0.5" id="student-profile-text-container">
                      <span className="text-xs font-black">الطالب: {currentUser?.name || "طالب مميز"}</span>
                      {auth.currentUser?.uid && (
                        <span className="text-[10px] text-purple-700 font-bold flex items-center gap-1.5" id="student-uid-indicator">
                          <span>الرقم المميز:</span>
                          <span className="font-mono bg-purple-50 px-1.5 py-0.5 rounded text-[10px] select-all border border-purple-100/40">
                            {auth.currentUser.uid}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(auth.currentUser?.uid || "");
                              alert("📋 تم نسخ الرقم المميز بنجاح!");
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-purple-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="نسخ الرقم المميز"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>



                    <button
                      type="button"
                      onClick={handleLogout}
                      className="bg-slate-100 hover:bg-slate-250 text-slate-800 py-1.5 px-2.5 sm:px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تسجيل خروج</span>
                    </button>
                  </div>

                </div>
              </header>

              <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 pb-36 z-10">
                
                {/* Google Drive Restore Suggestion Alert Banner */}
                {isLoggedIn && showRestoreSuggestion && cloudDriveBackup && (
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-pink-50 border border-purple-200/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg shrink-0">
                        ☁️
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-purple-950">توجد نسخة احتياطية أحدث على Google Drive! 📥</h4>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-normal font-bold">
                          تحتوي النسخة السحابية لحسابك على <strong className="text-purple-700">{cloudDriveBackup.points} نقطة</strong> ومستوى <strong className="text-pink-900">{cloudDriveBackup.level}</strong> مقارنة بنقاطك المحلية الحالية (<strong className="text-slate-700">{points} نقطة</strong>).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                      <button
                        type="button"
                        disabled={isRestoreLoading}
                        onClick={() => restoreFromGoogleDriveNow()}
                        className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-black text-xs cursor-pointer shadow-sm active:scale-95 transition-all text-center"
                      >
                        {isRestoreLoading ? "جاري الاستعادة..." : "استعادة التقدم بنقرة واحدة ⚡"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRestoreSuggestion(false)}
                        className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-all"
                      >
                        تجاهل
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {mainTab === "home" && (
                  <HomeWorkspace
                    unlockedLevel={unlockedLevel}
                    completedLevels={completedLevels}
                    currentTickTime={currentTickTime}
                    bonusMinutes={bonusMinutes}
                    setBonusMinutes={setBonusMinutes}
                    dailySecondsLeft={dailySecondsLeft}
                    extraAdClaimsCount={extraAdClaimsCount}
                    unlockedAdvertiserGroups={unlockedAdvertiserGroups}
                    completedGroupsProp={completedGroups}
                    setCompletedGroupsProp={setCompletedGroups}
                    completedWordsCount={completedWordsCount}
                    setCompletedWordsCount={setCompletedWordsCount}
                    studentSemester={studentSemester}
                    onUnlockGroup={(gKey) => {
                      const nextGroups = [...unlockedAdvertiserGroups, gKey];
                      setUnlockedAdvertiserGroups(nextGroups);
                      try {
                        localStorage.setItem("stitchlab_unlocked_ad_groups", JSON.stringify(nextGroups));
                      } catch (e) {}
                    }}
                    onLevelStart={(level) => {
                      setSelectedPersona(PRESET_PERSONAS.find(p => p.id === level.personaId) || PRESET_PERSONAS[0]);
                      setMainTab("training");
                      setActiveTab("chat");
                    }}
                    onLevelComplete={(lvlNum) => completeLevel(lvlNum)}
                    onResetProgress={resetAllLevelsProgress}
                    LEARNING_LEVELS={LEARNING_LEVELS}
                    onForceSaveProgress={handleForceSaveProgress}
                  />
                )}

                {mainTab === "training" && (
                  <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md rounded-3xl p-5 border border-pink-100 shadow-sm">
                      <div className="text-right">
                        <h2 className="text-2xl font-black text-purple-950 font-sans flex items-center gap-2">
                          <span>🔮</span>
                          <span>المختبر والمدرب التفاعلي الذكي</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          تحدث مع الذكاء الاصطناعي، تدرّب على صياغة الجمل، وسرّع من طلاقتك باستخدام الذكاء الاصطناعي من Gemini
                        </p>
                      </div>

                      {/* Sub tab buttons for practice type */}
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-2xl w-full md:w-auto overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setActiveTab("chat")}
                          className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "chat"
                              ? "bg-purple-600 text-white shadow-md font-bold"
                              : "text-slate-600 hover:text-slate-850 hover:bg-white/40 font-medium"
                          }`}
                        >
                          🎙️ الدردشة الذكية
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("analyzer")}
                          className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "analyzer"
                              ? "bg-purple-600 text-white shadow-md font-bold"
                              : "text-slate-600 hover:text-slate-850 hover:bg-white/40 font-medium"
                          }`}
                        >
                          🧠 محلل الجمل
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("quiz")}
                          className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "quiz"
                              ? "bg-purple-600 text-white shadow-md font-bold"
                              : "text-slate-600 hover:text-slate-850 hover:bg-white/40 font-medium"
                          }`}
                        >
                          📝 الاختبار الذكي
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("flashcards")}
                          className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "flashcards"
                              ? "bg-purple-600 text-white shadow-md font-bold"
                              : "text-slate-600 hover:text-slate-850 hover:bg-white/40 font-medium"
                          }`}
                        >
                          🗂️ الكروت التعليمية
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 shadow-2xl relative overflow-hidden ring-1 ring-slate-800/50">
                      {activeTab === "chat" && (
                        <ChatPanel
                          selectedPersona={selectedPersona}
                          onChangePersona={setSelectedPersona}
                          chatInputValue={chatInputValue}
                          setChatInputValue={setChatInputValue}
                          chatHistory={getActiveChatMessages()}
                          chatLoading={chatLoading}
                          chatTranslateToggle={!!chatTranslateToggle[selectedPersona.id]}
                          setChatTranslateToggle={(val) =>
                            setChatTranslateToggle((prev) => ({ ...prev, [selectedPersona.id]: val }))
                          }
                          onSendMessage={handleSendMessage}
                          onClearHistory={clearChatHistory}
                          speakText={speakText}
                          onQuickPaste={handleQuickPaste}
                        />
                      )}

                      {activeTab === "analyzer" && (
                        <AnalyzerPanel
                          analyzerInputValue={analyzerInputValue}
                          setAnalyzerInputValue={setAnalyzerInputValue}
                          analyzerLoading={analyzerLoading}
                          analyzerResult={analyzerResult}
                          analyzerError={analyzerError}
                          onAnalyzeSubmit={handleAnalyzeSentence}
                          onQuickPaste={handleQuickPaste}
                        />
                      )}

                      {activeTab === "quiz" && (
                        <QuizPanel
                          quizTopic={quizTopic}
                          setQuizTopic={setQuizTopic}
                          quizCustomTopic={quizCustomTopic}
                          setQuizCustomTopic={setQuizCustomTopic}
                          quizLevel={quizLevel}
                          setQuizLevel={setQuizLevel}
                          quizLoading={quizLoading}
                          quizQuestions={quizQuestions}
                          selectedAnswers={selectedAnswers}
                          submittedQuiz={submittedQuiz}
                          quizError={quizError}
                          quizScore={quizScore}
                          onGenerateQuiz={handleGenerateQuiz}
                          onSelectAnswer={handleSelectAnswer}
                          onGradeQuiz={handleGradeQuiz}
                        />
                      )}

                      {activeTab === "flashcards" && (
                        <FlashcardsPanel
                          flashcardSearch={flashcardSearch}
                          setFlashcardSearch={setFlashcardSearch}
                          flashcardLevelFilter={flashcardLevelFilter}
                          setFlashcardLevelFilter={setFlashcardLevelFilter}
                          showAddCardModal={showAddCardModal}
                          setShowAddCardModal={setShowAddCardModal}
                          newCardWord={newCardWord}
                          setNewCardWord={setNewCardWord}
                          newCardIpa={newCardIpa}
                          setNewCardIpa={setNewCardIpa}
                          newCardPartOfSpeech={newCardPartOfSpeech}
                          setNewCardPartOfSpeech={setNewCardPartOfSpeech}
                          newCardMeaning={newCardMeaning}
                          setNewCardMeaning={setNewCardMeaning}
                          newCardExample={newCardExample}
                          setNewCardExample={setNewCardExample}
                          newCardExampleTranslation={newCardExampleTranslation}
                          setNewCardExampleTranslation={setNewCardExampleTranslation}
                          newCardLevel={newCardLevel}
                          setNewCardLevel={setNewCardLevel}
                          onAddFlashcard={handleAddFlashcard}
                          onDeleteFlashcard={deleteCustomFlashcard}
                          filteredFlashcards={filteredFlashcards}
                          speakText={speakText}
                        />
                      )}
                    </div>
                  </div>
                )}

                {mainTab === "achievements" && (
                  <AchievementsWorkspace
                    conversationsHad={conversationsHad}
                    quizScore={quizScore}
                    quizAttempts={quizAttempts}
                    customFlashcardsCount={customFlashcards.length + PRESET_FLASHCARDS.length}
                    unlockedLevel={unlockedLevel}
                    completedLevels={completedLevels}
                    completedGroupsProp={completedGroups}
                    analyzedCountProp={analyzedCount}
                    onResetProgress={resetAllLevelsProgress}
                    DAILY_QUOTES={DAILY_QUOTES}
                    quoteIndex={quoteIndex}
                    setQuoteIndex={setQuoteIndex}
                  />
                )}

                {mainTab === "about" && (
                  <AboutWorkspace />
                )}

                {mainTab === "support" && (
                  <div className="max-w-md mx-auto text-center space-y-6 py-8 animate-fadeIn" dir="rtl">
                    <div className="w-20 h-20 bg-gradient-to-tr from-amber-100 to-amber-200 border border-amber-300 text-amber-800 rounded-3xl flex items-center justify-center mx-auto shadow-sm text-3xl">
                      🤝
                    </div>
                    
                    <div className="space-y-3 px-4">
                      <h2 className="text-xl font-black text-amber-950 font-serif">مركز جهود الدعم والمساعدة</h2>
                      <p className="text-slate-600 text-sm md:text-base leading-relaxed font-bold bg-white/50 p-4 border border-amber-100/50 rounded-2xl shadow-sm">
                        نحن هنا لمساعدتك. إذا واجهت أي مشكلة أو لديك استفسار، يُرجى التواصل معنا.
                      </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-amber-200/40 p-6 shadow-md max-w-sm mx-auto space-y-4">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                        صفحة التواصل الرسمية
                      </span>
                      
                      <a
                        href="https://www.facebook.com/profile.php?id=61578668730709"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-5 rounded-2xl text-xs font-black shadow-md hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all w-full cursor-pointer"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span>صفحتنا على فيسبوك</span>
                      </a>
                      
                      <p className="text-[10px] text-amber-950 font-mono select-all bg-amber-50/50 p-2.5 rounded-xl border border-amber-100" dir="ltr">
                        https://www.facebook.com/profile.php?id=61578668730709
                      </p>
                    </div>
                  </div>
                )}


              </main>

              <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-pink-100 py-3 px-6 shadow-[0_-8px_30px_rgba(236,72,153,0.06)] z-40 w-full">
                <div className="max-w-md mx-auto flex items-center justify-around gap-4 select-none" dir="rtl">
                  
                  <button
                    type="button"
                    onClick={() => setMainTab("home")}
                    className={`flex-1 max-w-[145px] flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-350 cursor-pointer ${
                      mainTab === "home" || mainTab === "training"
                        ? "text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-md scale-105 font-black" 
                        : "text-slate-500 hover:text-slate-850 hover:bg-slate-100"
                    }`}
                  >
                    <BookOpen className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-bold">الرئيسية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      console.log("Button clicked: Toggle settings modal from bottom navigation bar");
                      setShowSettingsModal(true);
                    }}
                    className={`flex-1 max-w-[145px] flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-350 cursor-pointer ${
                      showSettingsModal
                        ? "text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-md scale-105 font-black" 
                        : "text-slate-500 hover:text-slate-850 hover:bg-slate-100"
                    }`}
                  >
                    <Settings className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-bold">الإعدادات</span>
                  </button>

                </div>
              </nav>

              {/* Educational Learning Stopwatch Timer */}
              <LearningTimer isLoggedIn={isLoggedIn} />
            </>

        </div>
      )}

      {/* 2. GOOGLE DRIVE BACKUP & RESTORE MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800" dir="rtl">
          <div className="bg-white rounded-[32px] max-w-md w-full border border-purple-100 shadow-2xl p-6 md:p-8 space-y-5 relative overflow-hidden text-right">
            
            <button
              onClick={() => {
                setShowSyncModal(false);
              }}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors text-sm font-bold"
            >
              ✕
            </button>

            <div className="space-y-1.5">
              <span className="text-xs bg-purple-100 text-purple-950 font-black px-3.5 py-1 rounded-full border border-purple-200 inline-block">
                النسخ الاحتياطي السحابي التلقائي ☁️
              </span>
              <h3 className="text-xl font-black text-purple-950">مساحة Google Drive App Data</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                حافظ على تقدمك الدراسي، مجلد الكلمات الصعبة، النقاط، والأوسمة آمنة بنسبة 100% داخل مساحتك الخاصة على Google Drive واستعدها من أي جهاز متاح بنقرة واحدة!
              </p>
            </div>

            {!isLoggedIn ? (
              <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 text-center space-y-4">
                <p className="text-xs font-black text-amber-900 leading-relaxed">
                  ⚠️ يرجى تسجيل الدخول بحساب Google أولاً لتمكين عمليات النسخ السحابي واستعادة التقدم بنقرة واحدة.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await handleGoogleSignIn();
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-3 px-4 rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🔑 تسجيل الدخول باستخدام حساب Google</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connection Status Card */}
                {!driveToken ? (
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-blue-900 font-black text-xs">
                      <span>🔗 حساب Google متصل</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold leading-normal">
                      يرجى تفويض الاتصال بـ Google App Data للاتصال بنظام النسخ الاحتياطي التلقائي وسحب آخر نسخة متوفرة:
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleGoogleSignIn();
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl active:scale-95 transition-all cursor-pointer"
                    >
                      ربط وتفعيل ومزامنة Google Drive 🔄
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <span className="text-xs font-black text-emerald-900">🟢 متصل بنجاح بمساحتك الخاصة على Drive</span>
                    </div>

                    <div className="bg-white/80 rounded-xl p-3 border border-emerald-100/40 space-y-1.5 text-[11px] font-bold text-slate-700">
                      <div className="flex justify-between border-b border-dashed border-slate-100 pb-1.5 text-slate-500">
                        <span>النسخة الاحتياطية المتوفرة:</span>
                        <span className="text-emerald-950 font-black">
                          {cloudDriveBackup ? "موجودة ☁️" : "لا توجد نسخة سحابية"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>آخر تحديث بالدرايف:</span>
                        <span className="text-slate-900 text-left" dir="ltr">
                          {cloudDriveBackup ? new Date(cloudDriveBackup.updatedAt).toLocaleString("ar-EG") : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>المستوى السحابي:</span>
                        <span className="text-slate-900">
                          {cloudDriveBackup ? cloudDriveBackup.level : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>إجمالي النقاط:</span>
                        <span className="text-purple-900 font-black">
                          {cloudDriveBackup ? `${cloudDriveBackup.points} نقطة` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Control Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isBackupLoading}
                    onClick={() => backupToGoogleDriveNow()}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-350 text-white font-black text-xs py-3 px-4 rounded-xl active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isBackupLoading ? "🔄 جاري النسخ..." : "📤 نسخ احتياطي الآن"}
                  </button>

                  <button
                    type="button"
                    disabled={isRestoreLoading}
                    onClick={() => {
                      if (window.confirm("⚠️ هل أنت متأكد من رغبتك في استعادة التقدم الدراسي الآن واستبدال تقدمك على هذا الجهاز بالكامل بالبيانات المخزنة سحابياً؟")) {
                        restoreFromGoogleDriveNow();
                      }
                    }}
                    className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-350 text-white font-black text-xs py-3 px-4 rounded-xl active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isRestoreLoading ? "🔄 جاري الاستعادة..." : "📥 استعادة التقدم"}
                  </button>
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-400 font-bold border-t border-dashed border-slate-100 pt-3 text-center">
              🔒 خصوصية وأمان تام تضمنها Google: تطبيق StitchLab لا يستطيع الوصول لأي ملفات خارج البيانات الخاصة به.
            </div>
          </div>
        </div>
      )}

      {/* 4. UNIFIED SETTINGS GEAR MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800" dir="rtl">
          <div className="bg-white rounded-[32px] max-w-md w-full border border-purple-100 shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden text-right text-slate-800">
            
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors text-sm font-bold"
            >
              ✕
            </button>

            <div className="space-y-1.5 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-purple-950">
                <Settings className="w-6 h-6 text-purple-600 animate-spin" style={{ animationDuration: "6s" }} />
                <h3 className="text-xl font-black">إعدادات المنصة والتحكم</h3>
              </div>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                خصص تجربتك التعليمية، بادر بمزامنة تقدمك، تصفح إنجازاتك الدراسية، أو تواصل مع الدعم الفني مباشرة.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              
               {/* Option 1: Google Drive Cloud Backup */}
              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  setShowSyncModal(true);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-purple-100 hover:border-purple-200 bg-purple-50/20 hover:bg-purple-50/55 transition-all text-right cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-lg">☁️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-purple-950">النسخ الاحتياطي السحابي (Google Drive) ☁️</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">تفعيل وحفظ واستعادة تقدمك الدراسي ونقاطك آلياً داخل مساحة Google الدراسية الآمنة.</p>
                </div>
              </button>

              {/* Option 2: Achievements */}
              <button
                type="button"
                onClick={() => {
                  setMainTab("achievements");
                  setShowSettingsModal(false);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-amber-100 hover:border-amber-200 bg-amber-50/20 hover:bg-amber-50/50 transition-all text-right cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 group-hover:scale-110 transition-transform">
                  <Trophy className="w-5.5 h-5.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-amber-950">لوحة الإنجازات والوسام 🏆</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">تصفح إنجازاتك الدراسية، وكمية الكلمات المحفوظة وإجمالي الأسئلة لليوم.</p>
                </div>
              </button>

              {/* Option 3: About Us */}
              <button
                type="button"
                onClick={() => {
                  setMainTab("about");
                  setShowSettingsModal(false);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-indigo-100 hover:border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/50 transition-all text-right cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 group-hover:scale-110 transition-transform">
                  <Compass className="w-5.5 h-5.5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-indigo-950">من نحن ورؤيتنا 🔮</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">تعرف على منصة StitchLab وأهدافنا لتوفير حلول ذكاء اصطناعي تفاعلية للطلاب.</p>
                </div>
              </button>

              {/* Option 4: Support */}
              <button
                type="button"
                onClick={() => {
                  setMainTab("support");
                  setShowSettingsModal(false);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-pink-100 hover:border-pink-200 bg-pink-50/20 hover:bg-pink-50/50 transition-all text-right cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-pink-100 flex items-center justify-center text-pink-700 shrink-0 group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-5.5 h-5.5 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-pink-950">مركز الدعم والمساعدة المباشرة 🤝</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">تواصل مع إدارة المنصة، أرسل استفساراتك أو واجهتك مشكلة تقنية فنية.</p>
                </div>
              </button>

            </div>

            <div className="text-[10px] text-slate-400 font-bold flex flex-col gap-1 text-center border-t border-dashed border-slate-100 pt-3">
              <span>🔒 الأمان والمزامنة: جميع بياناتك مُشفرة وآمنة بالكامل بسحابة التطبيق.</span>
            </div>

          </div>
        </div>
      )}

      {/* ⚔️ GORGEOUS RESPONSIVE CHALLENGE ACCEPTANCE MODAL */}
      {showChallengeModal && challengeChallenger && (
        <div className="fixed inset-0 bg-[#090816]/75 backdrop-blur-xl z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-gradient-to-b from-[#191535] to-[#0d0a20] text-white rounded-[32px] max-w-md w-full border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.25)] p-6 md:p-8 space-y-6 relative overflow-hidden animate-fadeIn text-center">
            
            {/* Ambient background glow orb */}
            <div className="absolute top-[-20%] left-[-20%] w-44 h-44 bg-purple-600/30 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-44 h-44 bg-pink-600/20 rounded-full blur-[60px] pointer-events-none"></div>

            {/* Glowing Trophy / Sword Seal */}
            <div className="relative mx-auto w-20 h-20 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25 animate-bounce" style={{ animationDuration: "3s" }}>
              <span className="text-4xl">⚔️</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black text-amber-300 font-sans tracking-tight">قُبِلت المبارزة! تحدّي تعلَم جديد ⚔️🔥</h3>
              <p className="text-xs text-purple-200 font-bold tracking-wide leading-relaxed">
                دعوة مبارزة وتنافس تفاعلية حية حصرية على StitchLab منصة الذكاء الاصطناعي
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-right space-y-2.5">
              <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                لقد تحدّاك الطالب المتميّز <span className="text-pink-400 font-black underline decoration-2">{challengeChallenger}</span> في تعلّم الكلمات والطلاقة والحصول على المركز الأول!
              </p>
              <div className="text-[11px] text-amber-200/90 font-extrabold flex items-center gap-1.5">
                <span>🏆</span>
                <span>عند قبول التحدي، سيتم ربط حسابكما في لوحة المنافسين ومكافأة الفائزين بنقاط إضافية!</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    // Save to resolved list
                    const resolved = JSON.parse(localStorage.getItem("stitchlab_resolved_challenges") || "[]");
                    if (!resolved.includes(challengeChallenger)) {
                      resolved.push(challengeChallenger);
                    }
                    localStorage.setItem("stitchlab_resolved_challenges", JSON.stringify(resolved));

                    // Add opponent entry
                    const linked = JSON.parse(localStorage.getItem("stitchlab_linked_opponents") || "[]");
                    if (!linked.some((o: any) => o.name === challengeChallenger)) {
                      linked.push({
                        name: challengeChallenger,
                        timestamp: new Date().toLocaleDateString("ar-EG"),
                        opponentLevel: "Intermediate",
                        wordsCount: Math.floor(Math.random() * 25) + 15,
                        pointsScored: Math.floor(Math.random() * 220) + 70
                      });
                      localStorage.setItem("stitchlab_linked_opponents", JSON.stringify(linked));
                    }

                    // Dispatch reload event
                    window.dispatchEvent(new Event("stitchlab_challenge_accepted"));
                    setShowChallengeModal(false);

                    // Celebrate!
                    try {
                      playAudioFeedback(true);
                    } catch (e) {}

                    import("canvas-confetti").then((m) => {
                      m.default({
                        particleCount: 120,
                        spread: 70,
                        origin: { y: 0.65 },
                        colors: ["#F59E0B", "#D946EF", "#10B981"]
                      });
                    });
                  } catch (err) {
                    console.warn(err);
                    setShowChallengeModal(false);
                  }
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 text-xs font-black py-3.5 px-4 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer active:scale-95"
              >
                أقبل التحدي! 🤝
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    const resolved = JSON.parse(localStorage.getItem("stitchlab_resolved_challenges") || "[]");
                    if (!resolved.includes(challengeChallenger)) {
                      resolved.push(challengeChallenger);
                    }
                    localStorage.setItem("stitchlab_resolved_challenges", JSON.stringify(resolved));
                    setShowChallengeModal(false);
                  } catch (e) {
                    setShowChallengeModal(false);
                  }
                }}
                className="w-full bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold py-3.5 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                لاحقاً ⏱️
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
