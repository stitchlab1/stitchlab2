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
  X
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

// Import custom workspace sections
import { supabase, isSupabaseConfigured } from "./supabaseClient";
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

      const clickable = target.closest("button, [role='button'], a, input[type='submit'], input[type='button'], .cursor-pointer, [id*='level-card']");
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

  // Main UI Tab States
  const [activeTab, setActiveTab] = useState<"chat" | "analyzer" | "quiz" | "flashcards">("chat");

  // Game map state & custom tabs
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [mainTab, setMainTab] = useState<"home" | "achievements" | "about" | "certificates" | "support">("home");
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

  // Check state on load
  useEffect(() => {
    const savedUser = localStorage.getItem("stitchlab_user");
    if (savedUser) {
      try {
        const userObj = JSON.parse(savedUser);
        setCurrentUser(userObj);
        setUserLevel(userObj.level || "Intermediate");
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem("stitchlab_user");
      }
    }

    const randIndex = Math.floor(Math.random() * DAILY_QUOTES.length);
    setQuoteIndex(randIndex);

    const savedCards = localStorage.getItem("stitchlab_custom_cards");
    if (savedCards) {
      try {
        setCustomFlashcards(JSON.parse(savedCards));
      } catch (e) {}
    }

    const savedChatHistory = localStorage.getItem("stitchlab_chat_history_map");
    if (savedChatHistory) {
      try {
        setChatHistoryMap(JSON.parse(savedChatHistory));
      } catch (e) {}
    }

    const savedUnlocked = localStorage.getItem("stitchlab_unlocked_level");
    if (savedUnlocked) {
      setUnlockedLevel(parseInt(savedUnlocked, 10));
    }
    const savedCompleted = localStorage.getItem("stitchlab_completed_levels");
    if (savedCompleted) {
      try {
        setCompletedLevels(JSON.parse(savedCompleted));
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

  // Sync custom cards changes
  useEffect(() => {
    if (customFlashcards.length > 0) {
      localStorage.setItem("stitchlab_custom_cards", JSON.stringify(customFlashcards));
    }
  }, [customFlashcards]);

  // Timer interval: decrement study time remaining for active logged-in users under StitchLab
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

  // Auth: handle standard logins
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMessage("");
    setAuthLoading(true);

    if (!email || !password) {
      setAuthError("الرجاء إدخال البريد الإلكتروني وكلمة المرور.");
      setAuthLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          throw error;
        }

        if (data?.user) {
          const userSession = {
            name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "مستخدم Supabase",
            email: data.user.email || email,
            level: (data.user.user_metadata?.level as "Beginner" | "Intermediate" | "Advanced") || "Intermediate"
          };
          localStorage.setItem("stitchlab_user", JSON.stringify(userSession));
          setCurrentUser(userSession);
          setUserLevel(userSession.level);
          setIsLoggedIn(true);
        }
      } catch (err: any) {
        // Handle common email confirmation error
        if (err.message?.includes("Email not confirmed")) {
          setAuthError("لم يتم تأكيد بريدك الإلكتروني بعد. يرجى مراجعة بريدك الإلكتروني والضغط على رابط التأكيد لتتمكن من الدخول.");
        } else {
          setAuthError(err.message || "فشل تسجيل الدخول عبر Supabase.");
        }
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    // Fallback to offline local registration
    const savedAuths = localStorage.getItem("stitchlab_registered_users");
    let usersList = [];
    if (savedAuths) {
      try {
        usersList = JSON.parse(savedAuths);
      } catch (err) {}
    }

    const matchedUser = usersList.find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (matchedUser) {
      const userSession = { name: matchedUser.name, email: matchedUser.email, level: matchedUser.level };
      localStorage.setItem("stitchlab_user", JSON.stringify(userSession));
      setCurrentUser(userSession);
      setUserLevel(matchedUser.level);
      setIsLoggedIn(true);
    } else {
      if (email.toLowerCase() === "stitch@lab.com" && password === "123456") {
        const userSession = { name: "مُهند علي", email: "student@stitchlab.com", level: "Intermediate" as const };
        localStorage.setItem("stitchlab_user", JSON.stringify(userSession));
        setCurrentUser(userSession);
        setUserLevel("Intermediate");
        setIsLoggedIn(true);
      } else {
        setAuthError("البريد الإلكتروني أو كلمة المرور غير صحيحة. يمكنك النقر على زر زائر عابر للولوج السريع!");
      }
    }
    setAuthLoading(false);
  };

  // Auth: Register new user
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMessage("");
    setAuthLoading(true);

    if (!name || !email || !password) {
      setAuthError("جميع الحقول مطلوبة لإنشاء حساب جديد.");
      setAuthLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              level: userLevel
            },
            emailRedirectTo: window.location.origin
          }
        });

        if (error) {
          throw error;
        }

        // Supabase registration sets up confirmation email by default
        setAuthSuccessMessage("تم إرسال رابط تأكيد الحساب إلى بريدك الإلكتروني بنجاح! يرجى فحص علبة الوارد (أو البريد المزعج/Spam) والضغط على الرابط لتأكيد هويتك وتفعيل الحساب.");
        
        // Clean fields
        setEmail("");
        setPassword("");
        setName("");
      } catch (err: any) {
        setAuthError(err.message || "فشل إنشاء الحساب عبر Supabase.");
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    // Local authentication signup fallback
    const savedAuths = localStorage.getItem("stitchlab_registered_users");
    let usersList = [];
    if (savedAuths) {
      try {
        usersList = JSON.parse(savedAuths);
      } catch (err) {}
    }

    const alreadyExists = usersList.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (alreadyExists || email.toLowerCase() === "stitch@lab.com") {
      setAuthError("هذا البريد الإلكتروني مسجل بالفعل لدينا.");
      setAuthLoading(false);
      return;
    }

    const newUser = { name, email, password, level: userLevel };
    usersList.push(newUser);
    localStorage.setItem("stitchlab_registered_users", JSON.stringify(usersList));

    const userSession = { name, email, level: userLevel };
    localStorage.setItem("stitchlab_user", JSON.stringify(userSession));
    setCurrentUser(userSession);
    setIsLoggedIn(true);
    setAuthLoading(false);
  };

  // Fast demo bypass login
  const triggerQuickDemo = (level: "Beginner" | "Intermediate" | "Advanced") => {
    const demoUser = {
      name: "زائر التجربة الأنيق",
      email: `guest_${level.toLowerCase()}@stitchlab.edu`,
      level: level
    };
    localStorage.setItem("stitchlab_user", JSON.stringify(demoUser));
    setCurrentUser(demoUser);
    setUserLevel(level);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("stitchlab_user");
    setCurrentUser(null);
    setIsLoggedIn(false);
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
      
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            onClick={() => setShowSplash(false)}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-white cursor-pointer select-none"
            title="انقر لتخطي شاشة الترحيب"
          >
            {/* Ambient Background pattern - pink dots */}
            <div className="absolute inset-0 bg-[radial-gradient(#fbcfe8_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-70 pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-lg aspect-square flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 80, delay: 0.1 }}
                className="w-full h-full flex items-center justify-center"
              >
                <img 
                  src="/stitchlab_logo.png" 
                  alt="StitchLab Splash" 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[85vh] object-contain drop-shadow-2xl rounded-[2.5rem]"
                />
              </motion.div>
            </div>
            
            {/* Click to proceed hint in quiet font */}
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none select-none">
              <span className="text-xs text-slate-400 font-sans tracking-wide bg-pink-50/80 px-4 py-1.5 rounded-full border border-pink-100">
                انقر في أي مكان للدخول مباشرة 🚀
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. NOT LOGGED IN LAYOUT (Visual High-fidelity Onboarding Login in Soft Pink, White & Mauve) */}
      {!isLoggedIn ? (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-pink-50 via-[#FFF9FB] to-purple-50 text-slate-800 relative overflow-hidden">
          
          {/* Ambient luminous flows for modern feel */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="w-full max-w-md space-y-6 relative z-10">
            
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white border border-pink-100 shadow-xl overflow-hidden mb-2 p-1.5 animate-fadeIn">
                <img src="/stitchlab_logo.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
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

            <div className="bg-white/95 backdrop-blur-md rounded-[32px] border border-pink-100/50 p-6 md:p-8 shadow-[0_25px_60px_rgba(236,72,153,0.06)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex p-1 bg-slate-100/90 rounded-xl mb-6 border border-slate-200">
                <button
                  id="tab-btn-login"
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    authMode === "login" 
                      ? "bg-purple-600 text-white shadow-md font-bold" 
                      : "text-slate-500 hover:text-slate-850"
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  id="tab-btn-signup"
                  type="button"
                  onClick={() => { setAuthMode("signup"); setAuthError(""); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    authMode === "signup" 
                      ? "bg-purple-600 text-white shadow-md font-bold" 
                      : "text-slate-500 hover:text-slate-850"
                  }`}
                >
                  حساب جديد
                </button>
              </div>

              {authError && (
                <div className="p-3 mb-4 rounded-xl text-xs bg-rose-50 border border-rose-100 text-rose-700 flex items-start gap-2" dir="rtl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccessMessage && (
                <div className="p-3 mb-4 rounded-xl text-xs bg-emerald-50 border border-emerald-250 text-emerald-800 flex items-start gap-2 leading-relaxed" dir="rtl">
                  <span className="text-sm">✉️</span>
                  <span>{authSuccessMessage}</span>
                </div>
              )}

              {authMode === "login" ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        id="login-email-input"
                        type="email"
                        disabled={authLoading}
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pr-10 pl-4 py-3 bg-white border border-slate-250 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-left font-mono disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        id="login-password-input"
                        type="password"
                        disabled={authLoading}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pr-10 pl-4 py-3 bg-white border border-slate-250 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-left font-mono disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <button
                    id="submit-login-btn"
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 mt-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold rounded-xl text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span>{authLoading ? "جاري التحقق من الهوية..." : "دخول آمن"}</span>
                    {!authLoading && <ArrowRight className="w-4 h-4 transform rotate-180" />}
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">مساعدة سريعة</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="p-3 bg-pink-50/30 border border-pink-100/50 rounded-2xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-600">حساب تجريبي فوري وسريع:</span>
                      <span className="text-[10px] bg-pink-100 text-purple-700 px-1.5 py-0.5 rounded border border-pink-200/50 font-mono font-bold">1-Click</span>
                    </div>
                    <p className="text-[10px] text-slate-550 leading-relaxed font-mono font-sans select-all">
                      البريد: <b className="text-purple-700">stitch@lab.com</b> | كلمة المرور: <b className="text-purple-700">123456</b>
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("stitch@lab.com");
                          setPassword("123456");
                        }}
                        className="text-[11px] text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer"
                      >
                        كتب القيم تلقائياً للولوج الفوري
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">الاسم الكريم أو اللقب</label>
                    <div className="relative">
                      <User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-name-input"
                        type="text"
                        disabled={authLoading}
                        placeholder="مثال: أحمد الودود"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pr-10 pl-4 py-3 bg-white border border-slate-250 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all animate-fadeIn disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-email-input"
                        type="email"
                        disabled={authLoading}
                        placeholder="name@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pr-10 pl-4 py-3 bg-white border border-slate-250 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all text-left font-mono disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">كلمة المرور (دقيقة الرموز)</label>
                    <div className="relative">
                      <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-password-input"
                        type="password"
                        disabled={authLoading}
                        placeholder="أدخل 6 خانات على الأقل"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pr-10 pl-4 py-3 bg-white border border-slate-250 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all text-left font-mono disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">قسّم مستواك الحالي بالإنجليزية</label>
                    <select
                      id="signup-level-select"
                      disabled={authLoading}
                      value={userLevel}
                      onChange={(e) => setUserLevel(e.target.value as any)}
                      className="w-full px-3 py-3 bg-white border border-slate-250 rounded-xl text-sm text-slate-800 focus:outline-none cursor-pointer disabled:opacity-60"
                    >
                      <option value="Beginner">مبتدئ - Beginner</option>
                      <option value="Intermediate">متوسط - Intermediate</option>
                      <option value="Advanced">متقدم - Advanced</option>
                    </select>
                  </div>

                  <button
                    id="submit-signup-btn"
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 mt-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold rounded-xl text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span>{authLoading ? "جاري إنشاء الحساب وإرسال رابط التأكيد..." : "حبك الكلمات وتأسيس حساب"}</span>
                    {!authLoading && <ArrowRight className="w-4 h-4 transform rotate-180" />}
                  </button>
                </form>
              )}
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-[24px] p-5 border border-pink-100/60 shadow-[0_15px_30px_rgba(236,72,153,0.03)] space-y-3">
              <span className="text-xs font-bold text-slate-600 block text-center">أو جرب بنقرة واحدة سريعة كزائر عابر:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => triggerQuickDemo("Beginner")}
                  className="py-2.5 px-1 bg-slate-50 border border-slate-200 hover:border-purple-500 hover:bg-white rounded-lg text-[10px] text-slate-705 hover:text-purple-700 transition-all font-bold cursor-pointer"
                >
                  🌸 مـبتـدئ
                </button>
                <button
                  type="button"
                  onClick={() => triggerQuickDemo("Intermediate")}
                  className="py-2.5 px-1 bg-slate-50 border border-slate-200 hover:border-purple-500 hover:bg-white rounded-lg text-[10px] text-slate-705 hover:text-purple-700 transition-all font-bold cursor-pointer"
                >
                  ✨ متـوسـط
                </button>
                <button
                  type="button"
                  onClick={() => triggerQuickDemo("Advanced")}
                  className="py-2.5 px-1 bg-slate-50 border border-slate-200 hover:border-purple-500 hover:bg-white rounded-lg text-[10px] text-slate-705 hover:text-purple-700 transition-all font-bold cursor-pointer"
                >
                  🔮 متقــدم
                </button>
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-500 font-medium font-sans">
              جميع المحادثات والاختبارات تُفصل من خلال محركات الذكاء الاصطناعي التوليدي لـ Gemini 3.5.
            </p>
          </div>
        </div>
      ) : (
        /* 2. LOGGED IN DASHBOARD WORKSPACE */
        <div id="stitchlab-workspace" className="flex flex-col min-h-screen bg-gradient-to-br from-[#FDF2F4] via-white to-[#FAF0FF] text-slate-900 antialiased font-sans relative overflow-hidden">
          
          {dailySecondsLeft <= 0 ? (
            /* BLOCKED STUDY-TIME SCREEN (DEEP MAUVE BACKROUND & LIME ACCENTS) */
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#1F112D] text-center p-6 select-none relative z-50 animate-fadeIn" dir="rtl">
              {/* Absolutes for glowing premium ambient effects */}
              <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-[#CDFF00]/5 rounded-full blur-[110px] pointer-events-none"></div>
              <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] bg-[#CDFF00]/5 rounded-full blur-[110px] pointer-events-none"></div>

              <div className="max-w-md w-full space-y-8 z-10 relative px-4">
                <div className="w-24 h-24 bg-[#CDFF00]/10 border border-[#CDFF00]/30 text-[#CDFF00] rounded-full flex items-center justify-center mx-auto text-4xl shadow-[0_0_50px_rgba(205,255,0,0.15)] animate-bounce">
                  ⏱️
                </div>
                
                {extraAdClaimsCount < 3 ? (
                  /* EXTRAS OFFER FOR 15 EXTRA MINUTES */
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h2 className="text-2xl font-black text-[#CDFF00] tracking-tight leading-tight">
                        انتهى وقتك التعليمي المتاح لليوم!
                      </h2>
                      <p className="text-purple-100 text-sm leading-relaxed font-semibold">
                        لقد أمضيت 45 دقيقة كاملة من التدريب والتأسيس الممتاز اليوم. هل ترغب بمواصلة التعلم؟ شاهد إعلاناً قصيراً لربح <span className="text-[#CDFF00] underline font-extrabold">15 دقيقة إضافية</span> فوراً ومتابعة شغفك! 🎯
                      </p>
                      <p className="text-purple-305 text-[11px] font-bold">
                        المطالبات المتبقية لليوم: {3 - extraAdClaimsCount} من 3
                      </p>
                    </div>

                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={triggerExtraTimeAd}
                          className="w-full max-w-sm mx-auto py-4 px-6 bg-[#CDFF00] hover:bg-[#d6ff1a] text-purple-950 rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>الحصول على 15 دقيقة إضافية مجاناً</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="text-xs font-bold text-pink-400 hover:text-pink-500 transition-colors underline bg-transparent border-0 cursor-pointer"
                        >
                          تسجيل الخروج والعودة لاحقاً
                        </button>
                      </div>
                  </div>
                ) : (
                  /* FAREWELL SCREEN FOR 90m ACCESS EXCLUSION (LIME ON DARK MAUVE) */
                  <div className="space-y-6">
                    <h2 className="text-4xl font-extrabold text-[#CDFF00] font-sans leading-tight tracking-wide drop-shadow-[0_4px_12px_rgba(205,255,0,0.15)] animate-pulse">
                      عمل رائع، أحسنت عد غدا!
                    </h2>
                    <p className="text-purple-200 text-sm leading-relaxed max-w-sm mx-auto font-medium">
                      لقد أنجزت كامل التدريب اليومي الأقصى (90 دقيقة). مستواك يتطور وعقلك ممتن لاهتمامك. نراك غداً لتحدي جديد! 🌟
                    </p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-block px-8 py-3.5 bg-[#CDFF00] hover:bg-[#d4ff1a] text-slate-950 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      خروج من الحساب
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* REGULAR STUDY INTERACTIVE DASHBOARD VIEW */
            <>
              <header className="border-b border-pink-100 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3.5 shadow-[0_12px_35px_rgba(236,72,153,0.03)] relative z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-pink-100 shadow-sm overflow-hidden p-0.5 flex-shrink-0 select-none">
                      <img src="/stitchlab_logo.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h1 className="font-sans font-black text-xl tracking-tight">
                        <span className="text-purple-600 font-extrabold">Stitch</span>
                        <span className="text-pink-500 font-black">Lab</span>
                      </h1>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Visual Study Timer Badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-150/50 rounded-xl shadow-inner select-none">
                      <span className="text-[12px] animate-pulse">⏱️</span>
                      <span className="text-xs font-black text-purple-950 font-mono" dir="ltr">
                        {formatTime(dailySecondsLeft)}
                      </span>
                      <span className="text-[10px] text-purple-700 font-bold hidden xs:inline">متبقي</span>
                    </div>

                    <span className="text-xs font-bold text-slate-700 hidden sm:inline">الطالب: {currentUser?.name || "زائر التجربة"}</span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="bg-slate-100 hover:bg-slate-250 text-slate-800 py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>تسجيل خروج</span>
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
                    onUnlockGroup={(gKey) => {
                      const nextGroups = [...unlockedAdvertiserGroups, gKey];
                      setUnlockedAdvertiserGroups(nextGroups);
                      try {
                        localStorage.setItem("stitchlab_unlocked_ad_groups", JSON.stringify(nextGroups));
                      } catch (e) {}
                    }}
                    onLevelStart={(level) => {
                      setSelectedPersona(PRESET_PERSONAS.find(p => p.id === level.personaId) || PRESET_PERSONAS[0]);
                      setMainTab("support");
                      setActiveTab("chat");
                    }}
                    onLevelComplete={(lvlNum) => completeLevel(lvlNum)}
                    onResetProgress={resetAllLevelsProgress}
                    LEARNING_LEVELS={LEARNING_LEVELS}
                  />
                )}

                {mainTab === "achievements" && (
                  <AchievementsWorkspace
                    conversationsHad={conversationsHad}
                    quizScore={quizScore}
                    quizAttempts={quizAttempts}
                    customFlashcardsCount={customFlashcards.length + PRESET_FLASHCARDS.length}
                    unlockedLevel={unlockedLevel}
                    completedLevels={completedLevels}
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
              <LearningTimer />
            </>
          )}

        </div>
      )}

    </div>
  );
}
