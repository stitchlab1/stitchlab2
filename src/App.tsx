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
  Copy
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
import HomeWorkspace from "./components/HomeWorkspace";
import AchievementsWorkspace from "./components/AchievementsWorkspace";
import AboutWorkspace from "./components/AboutWorkspace";
import CertificatesWorkspace from "./components/CertificatesWorkspace";
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2.5 seconds
    return () => clearTimeout(timer);
  }, []);

  // Login / Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [userLevel, setUserLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; level: string } | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Firestore & Gamification states
  const [points, setPoints] = useState<number>(0);
  const [completedGroups, setCompletedGroups] = useState<string[]>([]);
  const [analyzedCount, setAnalyzedCount] = useState<number>(0);
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isInitialLoad = React.useRef<boolean>(true);

  useEffect(() => {
    localStorage.setItem("stitchlab_completed_words_count", completedWordsCount.toString());
  }, [completedWordsCount]);

  useEffect(() => {
    localStorage.setItem("stitchlab_student_semester", studentSemester);
  }, [studentSemester]);

  // Main UI Tab States
  const [activeTab, setActiveTab] = useState<"chat" | "analyzer" | "quiz" | "flashcards">("chat");

  // Game map state & custom tabs
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
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
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizAttempts, setQuizAttempts] = useState<number>(0);
  const [conversationsHad, setConversationsHad] = useState<number>(4);
  const [customFlashcards, setCustomFlashcards] = useState<Flashcard[]>([]);

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

  // Firebase auth state listener & firestore data bootstrap
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);
        setIsDataLoaded(false);
        setAuthLoading(true);
        setAuthError("");
        
        const uid = firebaseUser.uid;
        const studentRef = doc(db, "students", uid);

        // 1. Swifter client side restoration stage to ensure zero-waiting offline-ready states
        let localLoaded = false;
        try {
          const localUserLevel = localStorage.getItem("stitchlab_user_level") as any;
          const localPoints = localStorage.getItem("stitchlab_points");
          const localUnlockedLevel = localStorage.getItem("stitchlab_unlocked_level");
          const localCompletedLevels = localStorage.getItem("stitchlab_completed_levels");
          const localCompletedGroups = localStorage.getItem("stitchlab_completed_groups");
          const localCustomFlashcards = localStorage.getItem("stitchlab_custom_cards");
          const localConversationsHad = localStorage.getItem("stitchlab_conversations_had");
          const localQuizScore = localStorage.getItem("stitchlab_quiz_score");
          const localQuizAttempts = localStorage.getItem("stitchlab_quiz_attempts");
          const localAnalyzedCount = localStorage.getItem("stitchlab_analyzed_count");
          const cachedName = localStorage.getItem("stitchlab_cached_name");
          const localCompletedWordsCount = localStorage.getItem("stitchlab_completed_words_count");
          const localStudentSemester = localStorage.getItem("stitchlab_student_semester");

          if (localUserLevel !== null) {
            setUserLevel(localUserLevel || "Intermediate");
            setPoints(localPoints ? parseInt(localPoints, 10) : 0);
            setUnlockedLevel(localUnlockedLevel ? parseInt(localUnlockedLevel, 10) : 1);
            setCompletedLevels(localCompletedLevels ? JSON.parse(localCompletedLevels) : []);
            setCompletedGroups(localCompletedGroups ? JSON.parse(localCompletedGroups) : []);
            setCustomFlashcards(localCustomFlashcards ? JSON.parse(localCustomFlashcards) : []);
            setConversationsHad(localConversationsHad ? parseInt(localConversationsHad, 10) : 0);
            setQuizScore(localQuizScore ? parseInt(localQuizScore, 10) : 0);
            setQuizAttempts(localQuizAttempts ? parseInt(localQuizAttempts, 10) : 0);
            setAnalyzedCount(localAnalyzedCount ? parseInt(localAnalyzedCount, 10) : 0);
            if (localCompletedWordsCount !== null) setCompletedWordsCount(parseInt(localCompletedWordsCount, 10));
            if (localStudentSemester !== null) setStudentSemester(localStudentSemester);
            setCurrentUser({
              name: cachedName || firebaseUser.displayName || "طالب مميز",
              email: firebaseUser.email || "",
              level: localUserLevel || "Intermediate"
            });
            setIsDataLoaded(true);
            localLoaded = true;
            console.log("StitchLab: Local storage warm-start loaded instantly for UI. ⭐");
          }
        } catch (e) {
          console.warn("StitchLab client restoration warm start skipped:", e);
        }
        
        let studentDoc = null;
        try {
          // Attempt Cache-First retrieval to save Firestore read quota
          studentDoc = await getDocFromCache(studentRef);
          
          if (!studentDoc || !studentDoc.exists()) {
            throw new Error("cache-miss");
          }
          console.log("StitchLab: Student document successfully loaded from local CACHE (Cache-First) to save read quota. ⭐");
        } catch (cacheErr) {
          try {
            // Live server query fallback
            studentDoc = await getDoc(studentRef);
            console.log("StitchLab: Student document successfully fetched from live servers. 🌐");
          } catch (serverErr) {
            console.warn("Cloud read unavailable or user not initialized yet:", serverErr);
          }
        }

        if (studentDoc && studentDoc.exists()) {
          const data = studentDoc.data();
          setCurrentUser({
            name: data.name || firebaseUser.displayName || "طالب مميز",
            email: data.email || firebaseUser.email || "",
            level: data.level || "Intermediate"
          });
          setUserLevel(data.level || "Intermediate");
          setUnlockedLevel(data.unlockedLevel || 1);
          setCompletedLevels(data.completedLevels || []);
          setCompletedGroups(data.completedGroups || []);
          setCustomFlashcards(data.customFlashcards || []);
          setConversationsHad(data.conversationsHad || 0);
          setQuizScore(data.quizScore || 0);
          setQuizAttempts(data.quizAttempts || 0);
          setAnalyzedCount(data.analyzedCount || 0);
          setPoints(data.points || 0);
          setCompletedWordsCount(data.completedWordsCount || 0);
          setStudentSemester(data.studentSemester || "الفصل الدراسي الأول");
          
          // Save server sync snapshots back to client
          localStorage.setItem("stitchlab_user_level", data.level || "Intermediate");
          localStorage.setItem("stitchlab_points", (data.points || 0).toString());
          localStorage.setItem("stitchlab_unlocked_level", (data.unlockedLevel || 1).toString());
          localStorage.setItem("stitchlab_completed_levels", JSON.stringify(data.completedLevels || []));
          localStorage.setItem("stitchlab_completed_groups", JSON.stringify(data.completedGroups || []));
          localStorage.setItem("stitchlab_custom_cards", JSON.stringify(data.customFlashcards || []));
          localStorage.setItem("stitchlab_conversations_had", (data.conversationsHad || 0).toString());
          localStorage.setItem("stitchlab_quiz_score", (data.quizScore || 0).toString());
          localStorage.setItem("stitchlab_quiz_attempts", (data.quizAttempts || 0).toString());
          localStorage.setItem("stitchlab_analyzed_count", (data.analyzedCount || 0).toString());
          localStorage.setItem("stitchlab_completed_words_count", (data.completedWordsCount || 0).toString());
          localStorage.setItem("stitchlab_student_semester", data.studentSemester || "الفصل الدراسي الأول");
          localStorage.setItem("stitchlab_cached_name", data.name || firebaseUser.displayName || "طالب مميز");
        } else if (!localLoaded) {
          // New student setup - automatic creation in Firestore with standard UID
          const newStudentData = {
            uid: uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "طالب مميز",
            level: "Intermediate" as const,
            points: 0,
            unlockedLevel: 1,
            completedLevels: [],
            completedGroups: [],
            customFlashcards: [],
            conversationsHad: 0,
            quizScore: 0,
            quizAttempts: 0,
            analyzedCount: 0,
            completedWordsCount: 0,
            studentSemester: "الفصل الدراسي الأول",
            visitDates: [new Date().toISOString().split("T")[0]],
            unlockedAdvertiserGroups: [],
            dailySecondsLeft: 2700,
            extraAdClaimsCount: 0,
            updatedAt: new Date().toISOString()
          };

          try {
            await setDoc(studentDoc ? studentRef : doc(db, "students", uid), newStudentData);
            console.log("StitchLab: New student automatic document created.");
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `students/${uid}`);
          }

          setCurrentUser({
            name: newStudentData.name,
            email: newStudentData.email,
            level: newStudentData.level
          });
          setUserLevel(newStudentData.level);
          setUnlockedLevel(1);
          setCompletedLevels([]);
          setCompletedGroups([]);
          setCustomFlashcards([]);
          setConversationsHad(0);
          setQuizScore(0);
          setQuizAttempts(0);
          setAnalyzedCount(0);
          setPoints(0);
          setCompletedWordsCount(0);
          setStudentSemester("الفصل الدراسي الأول");
          
          // Clear current local persistence keys to match new registered profile
          localStorage.setItem("stitchlab_user_level", "Intermediate");
          localStorage.setItem("stitchlab_points", "0");
          localStorage.setItem("stitchlab_unlocked_level", "1");
          localStorage.setItem("stitchlab_completed_levels", JSON.stringify([]));
          localStorage.setItem("stitchlab_completed_groups", JSON.stringify([]));
          localStorage.setItem("stitchlab_custom_cards", JSON.stringify([]));
          localStorage.setItem("stitchlab_conversations_had", "0");
          localStorage.setItem("stitchlab_quiz_score", "0");
          localStorage.setItem("stitchlab_quiz_attempts", "0");
          localStorage.setItem("stitchlab_analyzed_count", "0");
          localStorage.setItem("stitchlab_completed_words_count", "0");
          localStorage.setItem("stitchlab_student_semester", "الفصل الدراسي الأول");
          localStorage.setItem("stitchlab_cached_name", newStudentData.name);
        }
        setIsDataLoaded(true);
        setAuthLoading(false);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setIsDataLoaded(false);
        setAuthLoading(false);
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

  // Monitor user state edits to set unsaved changes flag and save immediately to localStorage for ultimate safe offline persistence
  useEffect(() => {
    if (!isLoggedIn || !isDataLoaded) return;
    
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
    
    if (isInitialLoad.current) {
      return;
    }
    
    setHasUnsavedChanges(true);
  }, [
    isLoggedIn,
    isDataLoaded,
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

  // Economy Cloud Save API (Writes to Firestore collectively on request/logout)
  const saveProgressToFirestore = async (silent = false) => {
    if (!isLoggedIn || !isDataLoaded || !auth.currentUser) return;
    setIsSyncing(true);
    const uid = auth.currentUser.uid;
    const studentRef = doc(db, "students", uid);
    try {
      await updateDoc(studentRef, {
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
        updatedAt: serverTimestamp()
      });
      setHasUnsavedChanges(false);
      console.log("StitchLab data saved successfully to Firestore.");
      if (!silent) {
        try { playAudioFeedback(true); } catch(e) {}
        alert("🎉 تم حفظ جميع التغييرات وتقدمك الحالي بنجاح في السحابة! تم توفير القراءات والاقتصار على مزامنتك الذكية. ⚡☁️");
      }
    } catch (err) {
      console.error("Save progress failed:", err);
      if (!silent) {
        alert("⚠️ فشل في حفظ البيانات السحابية. يرجى التحقق من اتصال الإنترنت وحاول مجدداً.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Force Live Firestore fetch (Overrides Cache-First strategy on user command)
  const forceRefreshFromFirestore = async () => {
    if (!auth.currentUser) return;
    setAuthLoading(true);
    setAuthError("");
    setIsDataLoaded(false);
    const uid = auth.currentUser.uid;
    const studentRef = doc(db, "students", uid);
    try {
      const studentDoc = await getDoc(studentRef);
      if (studentDoc && studentDoc.exists()) {
        const data = studentDoc.data();
        setCurrentUser({
          name: data.name || auth.currentUser.displayName || "طالب مميز",
          email: data.email || auth.currentUser.email || "",
          level: data.level || "Intermediate"
        });
        setUserLevel(data.level || "Intermediate");
        setUnlockedLevel(data.unlockedLevel || 1);
        setCompletedLevels(data.completedLevels || []);
        setCompletedGroups(data.completedGroups || []);
        setCustomFlashcards(data.customFlashcards || []);
        setConversationsHad(data.conversationsHad || 0);
        setQuizScore(data.quizScore || 0);
        setQuizAttempts(data.quizAttempts || 0);
        setAnalyzedCount(data.analyzedCount || 0);
        setPoints(data.points || 0);
        setCompletedWordsCount(data.completedWordsCount || 0);
        setStudentSemester(data.studentSemester || "الفصل الدراسي الأول");
        
        localStorage.setItem("stitchlab_completed_groups", JSON.stringify(data.completedGroups || []));
        localStorage.setItem("stitchlab_custom_cards", JSON.stringify(data.customFlashcards || []));
        localStorage.setItem("stitchlab_unlocked_level", (data.unlockedLevel || 1).toString());
        localStorage.setItem("stitchlab_completed_levels", JSON.stringify(data.completedLevels || []));
        localStorage.setItem("stitchlab_analyzed_count", (data.analyzedCount || 0).toString());
        localStorage.setItem("stitchlab_completed_words_count", (data.completedWordsCount || 0).toString());
        localStorage.setItem("stitchlab_student_semester", data.studentSemester || "الفصل الدراسي الأول");
        
        setHasUnsavedChanges(false);
        alert("🔄 تم تحديث جميع البيانات مباشرة من السيرفر السحابي لـ Firestore بنجاح! ☁️");
      } else {
        alert("⚠️ لم يتم العثور على وثيقة الطالب في السحابة.");
      }
    } catch (err: any) {
      console.error("Force refresh failed:", err);
      alert(`⚠️ خطأ في مزامنة البيانات: ${err.message || err}`);
    } finally {
      setIsDataLoaded(true);
      setAuthLoading(false);
    }
  };

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

  // Auth: handle Google Sign-In via Firebase Popup
  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
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
          await saveProgressToFirestore(true);
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

  return (
    <div id="stitchlab-main" className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-purple-500 selection:text-white" dir="rtl">
      
      {/* 1. NOT LOGGED IN LAYOUT / OR LOADING SATELLITE */}
      {!isLoggedIn ? (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-pink-50 via-[#FFF9FB] to-purple-50 text-slate-800 relative overflow-hidden">
          
          {/* Ambient luminous flows for modern feel */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="w-full max-w-md space-y-6 relative z-10">
            
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white border border-pink-100 shadow-xl overflow-hidden mb-2 p-1.5 animate-fadeIn">
                <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/d50e6c29754ea11612492e06c68b3513b20af0f5/file_00000000350071f4a16cedee12520267~3.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
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

            <div className="bg-white/95 backdrop-blur-md rounded-[32px] border border-pink-100/50 p-6 md:p-8 shadow-[0_25px_60px_rgba(236,72,153,0.06)] relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="text-center space-y-2">
                <span className="text-xs bg-purple-100 text-purple-950 font-black px-3.5 py-1.5 rounded-full border border-purple-200">
                  سجّل دخولك مجانًا 🎓
                </span>
                <p className="text-xs text-slate-500 font-bold leading-relaxed pt-2">
                  للاحتفاظ بنقاطك، تقدمك، ومستواك التعليمي مشفرًا ومحفوظاً على السحابة طوال الوقت!
                </p>
              </div>

              {authError && (
                <div className="p-4 mb-4 rounded-2xl text-xs bg-rose-50 border border-rose-150 text-rose-800 flex items-start gap-2" dir="rtl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="whitespace-pre-line leading-relaxed text-right font-medium flex-1">{authError}</div>
                </div>
              )}

              <button
                id="submit-google-login-btn"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-lg active:scale-95 hover:shadow-purple-500/10 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {authLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    <span>جاري الاتصال بـ Google...</span>
                  </span>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>الدخول السريع بحساب Google</span>
                  </>
                )}
              </button>

              <div className="pt-2 flex justify-center items-center">
                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  تشفير آمن بنسبة 100% 🔒
                </span>
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-550 font-bold font-sans">
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
            <p className="text-xs font-black text-purple-950 animate-pulse">جاري تحميل وثائق وتقدم الطالب من السحابة... ⚡</p>
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
                       <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/d50e6c29754ea11612492e06c68b3513b20af0f5/file_00000000350071f4a16cedee12520267~3.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h1 className="font-sans font-black text-xl tracking-tight">
                        <span className="text-purple-600 font-extrabold">Stitch</span>
                        <span className="text-pink-500 font-black">Lab</span>
                      </h1>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">



                    {/* Semester box */}
                    <div className="flex items-center gap-1 bg-sky-50 border border-sky-100 text-sky-700 px-2.5 py-1 rounded-full text-xs font-black shadow-sm" id="student-header-semester">
                      <span>📅</span>
                      <span>الترم: {studentSemester}</span>
                    </div>
                    
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

                {mainTab === "certificates" && (
                  <CertificatesWorkspace
                    completedLevels={completedLevels}
                    userName={currentUser?.name || ""}
                    LEARNING_LEVELS={LEARNING_LEVELS}
                  />
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

              <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-pink-100 py-3.5 px-6 shadow-[0_-8px_30px_rgba(236,72,153,0.06)] z-40 w-full">
                <div className="max-w-xl mx-auto flex items-center justify-between gap-1 select-none" dir="rtl">
                  
                  <button
                    type="button"
                    onClick={() => setMainTab("home")}
                    className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all duration-300 cursor-pointer ${
                      mainTab === "home" 
                        ? "text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-sm scale-105 font-black" 
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div className="transition-transform duration-300 group-hover:scale-110">
                      <BookOpen className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[10px] font-bold">الرئيسية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMainTab("achievements")}
                    className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all duration-300 cursor-pointer ${
                      mainTab === "achievements" 
                        ? "text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-sm scale-105 font-black" 
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <Trophy className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[10px] font-bold">الإنجازات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMainTab("about")}
                    className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all duration-300 cursor-pointer ${
                      mainTab === "about" 
                        ? "text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-sm scale-105 font-black" 
                        : "text-slate-500 hover:text-slate-850 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <Compass className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[10px] font-bold">من نحن</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMainTab("certificates")}
                    className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all duration-300 cursor-pointer ${
                      mainTab === "certificates" 
                        ? "text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-sm scale-105 font-black" 
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <Award className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[10px] font-bold">شهاداتنا</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMainTab("support")}
                    className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all duration-300 cursor-pointer ${
                      mainTab === "support" 
                        ? "text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-sm scale-105 font-black" 
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <HelpCircle className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[10px] font-bold">الدعم</span>
                  </button>

                </div>
              </nav>
              
              {/* Educational Learning Stopwatch Timer */}
              <LearningTimer isLoggedIn={isLoggedIn} />
            </>

        </div>
      )}

    </div>
  );
}
