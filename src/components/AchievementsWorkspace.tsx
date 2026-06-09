import React from "react";
import { Trophy, RefreshCw, Star, Trash2, ArrowRight } from "lucide-react";

interface DailyQuote {
  quote: string;
  author: string;
  translation: string;
}

interface AchievementsWorkspaceProps {
  conversationsHad: number;
  quizScore: number;
  quizAttempts: number;
  customFlashcardsCount: number;
  unlockedLevel: number;
  completedLevels: number[];
  onResetProgress: () => void;
  DAILY_QUOTES: DailyQuote[];
  quoteIndex: number;
  setQuoteIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function AchievementsWorkspace({
  conversationsHad,
  quizScore,
  quizAttempts,
  customFlashcardsCount,
  unlockedLevel,
  completedLevels,
  onResetProgress,
  DAILY_QUOTES,
  quoteIndex,
  setQuoteIndex
}: AchievementsWorkspaceProps) {
  // Compute percentage progress
  const progressPercent = Math.round((completedLevels.length / 9) * 100);

  // Load supporting states from localStorage for advanced metrics
  const completedGroups = React.useMemo(() => {
    try {
      const saved = localStorage.getItem("stitchlab_completed_groups");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }, []);

  const analyzedCount = React.useMemo(() => {
    const val = localStorage.getItem("stitchlab_analyzed_count");
    return val ? parseInt(val, 10) : 0;
  }, []);

  const customCardsCount = React.useMemo(() => {
    try {
      const saved = localStorage.getItem("stitchlab_custom_cards");
      return saved ? JSON.parse(saved).length : 0;
    } catch (e) {
      return 0;
    }
  }, []);

  // Compute calculated values
  const totalWordsLearned = customCardsCount + (completedGroups.length * 4);
  
  const streakDays = React.useMemo(() => {
    const savedVisitDates = localStorage.getItem("stitchlab_visit_dates");
    let dates: string[] = [];
    try {
      dates = savedVisitDates ? JSON.parse(savedVisitDates) : [];
    } catch (e) {
      dates = [];
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (!dates.includes(todayStr)) {
      dates.push(todayStr);
      dates.sort();
      localStorage.setItem("stitchlab_visit_dates", JSON.stringify(dates));
    }
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    let cursor = new Date();
    while (true) {
      const cursorStr = cursor.toISOString().split('T')[0];
      if (dates.includes(cursorStr)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    
    if (streak === 0 && dates.length > 0) {
      let yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (dates.includes(yesterdayStr)) {
        streak = 1;
        let cursor = new Date(yesterday);
        cursor.setDate(cursor.getDate() - 1);
        while (true) {
          const cursorStr = cursor.toISOString().split('T')[0];
          if (dates.includes(cursorStr)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }
    return streak;
  }, []);

  // The custom responsive user requested list of achievements
  const BADGES = [
    {
      id: "first_10_words",
      title: "أول 10 كلمات",
      requirement: "تعلم 10 كلمات جديدة",
      icon: "📚",
      unlocked: totalWordsLearned >= 10,
      colorClass: "from-[#f2a2b1]/20 to-[#dd7390]/10 border-[#f2a2b1] text-purple-950",
      progress: `${Math.min(totalWordsLearned, 10)} / 10 كلمة`
    },
    {
      id: "first_grammar",
      title: "أول قاعدة",
      requirement: "أكمل أول قاعدة نحوية",
      icon: "✍️",
      unlocked: analyzedCount >= 1 || completedLevels.length >= 1,
      colorClass: "from-amber-100/30 to-yellow-100/20 border-amber-300 text-amber-900",
      progress: `${(analyzedCount >= 1 || completedLevels.length >= 1) ? 1 : 0} / 1 قاعدة`
    },
    {
      id: "semester_1_complete",
      title: "إنهاء الترم الأول",
      requirement: "أنهِ جميع دروس الترم الأول",
      icon: "🎓",
      unlocked: completedLevels.includes(1) && completedLevels.includes(2) && completedLevels.includes(3),
      colorClass: "from-sky-100/40 to-blue-50/20 border-sky-305 text-sky-900",
      progress: `${[1, 2, 3].filter(l => completedLevels.includes(l)).length} / 3 مستويات`
    },
    {
      id: "streak_7_days",
      title: "دخول 7 أيام متتالية",
      requirement: "ادخل التطبيق 7 أيام بالتتابع",
      icon: "🔥",
      unlocked: streakDays >= 7,
      colorClass: "from-orange-100/30 to-red-50/20 border-orange-355 text-orange-900",
      progress: `${streakDays} / 7 أيام`
    },
    {
      id: "full_level_complete",
      title: "إنهاء مستوى كامل",
      requirement: "أنهِ مستوى تعليمي كامل",
      icon: "🏆",
      unlocked: completedLevels.length >= 1,
      colorClass: "from-emerald-100/30 to-teal-50/20 border-emerald-355 text-emerald-900",
      progress: `${completedLevels.length} / 1 مستويات`
    },
    {
      id: "words_hero",
      title: "بطل الكلمات",
      requirement: "تعلم 100 كلمة جديدة",
      icon: "🦁",
      unlocked: totalWordsLearned >= 100,
      colorClass: "from-[#c0c6f4]/30 to-indigo-50/20 border-[#c0c6f4] text-indigo-900",
      progress: `${Math.min(totalWordsLearned, 100)} / 100 كلمة`
    },
    {
      id: "grammar_star",
      title: "نجم القواعد",
      requirement: "أتقن 10 قواعد نحوية",
      icon: "⭐",
      unlocked: analyzedCount >= 10 || completedLevels.length >= 5,
      colorClass: "from-yellow-100/40 to-amber-50/20 border-yellow-355 text-amber-950",
      progress: `${Math.min(analyzedCount, 10)} / 10 قواعد`
    },
    {
      id: "persistent_learner",
      title: "متعلم مثابر",
      requirement: "أكمل 30 درسًا",
      icon: "⚡",
      unlocked: completedGroups.length >= 30,
      colorClass: "from-purple-100/30 to-pink-50/20 border-purple-355 text-[#dd7390]",
      progress: `${Math.min(completedGroups.length, 30)} / 30 درسًا`
    }
  ];

  return (
    <div className="space-y-6 text-right scroll-smooth" dir="rtl">
      
      {/* Banner Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <Trophy className="w-10 h-10 text-yellow-300 animate-bounce" />
          <h2 className="text-xl font-extrabold font-sans">درع التميز وتتبع الإنجازات اللغوية ✨</h2>
          <p className="text-xs text-white/90 font-medium">
            هنا تُقاس جهودك المباركة في تطوير مهاراتك وصناعة مستقبلك الواعد بذكاء وتميز.
          </p>
        </div>
      </div>

      {/* Math Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm text-center flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 font-black block mb-1">جلسات المحادثة</span>
          <span className="text-2xl font-black text-indigo-500 font-mono">{conversationsHad}</span>
          <span className="text-[9px] text-slate-500 block">تبادل تدريبي متفاعل</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm text-center flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 font-black block mb-1">أقصى علامة اختبار</span>
          <span className="text-2xl font-black text-emerald-500 font-mono">{quizScore}%</span>
          <span className="text-[9px] text-slate-500 block">من {quizAttempts} محاولات شاملة</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm text-center flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 font-black block mb-1">مفردات الأطلس</span>
          <span className="text-2xl font-black text-rose-500 font-mono">{customFlashcardsCount}</span>
          <span className="text-[9px] text-slate-500 block">المرادفات وبطاقات الحفظ</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm text-center flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 font-black block mb-1">المستويات المفتوحة</span>
          <span className="text-2xl font-black text-[#dd7390] font-mono">{unlockedLevel}/9</span>
          <span className="text-[9px] text-slate-500 block">{progressPercent}% اكتمال الأطلس</span>
        </div>

      </div>

      {/* Progress Bar details */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-700">تطور وتكامل مهارات اللغة العام:</span>
          <span className="font-mono font-black text-indigo-600">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner flex">
          <div
            className="bg-gradient-to-r from-indigo-500 to-[#dd7390] h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-[10px] text-slate-400">
          لقد قمت بإتمام <strong>{completedLevels.length}</strong> مستوى من أصل <strong>9</strong> مستويات تفاعلية ممتازة. استمر في الممارسة لتكسب الشارات والشهادات الفخمة!
        </p>
      </div>

      {/* Daily Motivational Quote & Refresher */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-inner border border-slate-800 space-y-3">
        <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
          <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-2 py-0.5 rounded border border-indigo-500/20">النصائح والتعليمات اللغوية اليومية (Daily Advice)</span>
          <button
            type="button"
            onClick={() => {
              const nextIdx = (quoteIndex + 1) % DAILY_QUOTES.length;
              setQuoteIndex(nextIdx);
            }}
            className="text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>حكمة أخرى</span>
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        <p className="text-sm italic font-serif leading-relaxed text-slate-100 tracking-wide select-all text-left" dir="ltr">
          "{DAILY_QUOTES[quoteIndex].quote}"
        </p>
        <p className="text-xs text-slate-400 text-left" dir="ltr">— {DAILY_QUOTES[quoteIndex].author}</p>
        <p className="text-xs text-indigo-200 border-r-2 border-[#dd7390] pr-2 pt-1 font-sans">
          {DAILY_QUOTES[quoteIndex].translation}
        </p>
      </div>

      {/* Achievements Badges Grid */}
      <div className="space-y-4">
        <div className="border-r-4 border-purple-500 pr-3 py-1">
          <h3 className="text-base font-black text-slate-800">قائمة الإنجازات</h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">افتح الإنجازات بإكمال الدروس والتحديات</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BADGES.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-3xl border flex items-start gap-4 transition-all relative overflow-hidden ${
                badge.unlocked
                  ? `bg-white hover:shadow-md border-purple-200 shadow-sm`
                  : "bg-slate-100/60 border-slate-200/80 opacity-65"
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                badge.unlocked 
                  ? 'bg-purple-50 border border-purple-100 shadow-sm' 
                  : 'bg-slate-200/85 border border-slate-300 text-slate-400'
              }`}>
                {badge.unlocked ? badge.icon : "🔒"}
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-xs font-black flex items-center gap-1.5 text-slate-800 justify-between">
                  <span>{badge.title}</span>
                  {badge.unlocked ? (
                    <span className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-extrabold shadow-sm shadow-purple-200">مكتملة ✓</span>
                  ) : (
                    <span className="text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">مقفلة</span>
                  )}
                </h4>
                <p className="text-[11.5px] text-slate-650 font-bold">
                  {badge.requirement}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1.5 text-[9.5px]">
                  <span className="text-slate-400">مؤشر التقدم:</span>
                  <span className="font-mono font-black text-purple-600">{badge.progress}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Reset Utility Block */}
      <div className="bg-rose-50 border border-rose-100 p-4 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="space-y-0.5 text-center md:text-right">
          <h4 className="text-xs font-black text-rose-800">تصفير مسار التقدم وإعادة الأقفال (Reset Progress)</h4>
          <p className="text-[9px] text-rose-500 leading-normal">
            هل ترغب في خوض غمار التحديات التسعة بالكامل من البداية وتأسيس مسار من الصفر؟
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("هل أنت متأكد تماماً من تصفير وإعادة قفل جميع المستويات؟")) {
              onResetProgress();
            }
          }}
          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[10px] transition-colors"
        >
          <span>تصفير المسار بالكامل 🗑️</span>
        </button>
      </div>

    </div>
  );
}
