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

  // Hardcoded highly attractive achievements badges
  const BADGES = [
    {
      id: "soho",
      title: "مرحب Soho (Soho Explorer)",
      requirement: "أكمل المستوى 1 لكسر الجمود",
      icon: "🌸",
      unlocked: completedLevels.includes(1),
      colorClass: "from-pink-100 to-pink-200 border-pink-400 text-pink-700"
    },
    {
      id: "barista",
      title: "ذواق القهوة (Barista Speaker)",
      requirement: "أكمل المستوى 2 للتبادل المهذب",
      icon: "☕",
      unlocked: completedLevels.includes(2),
      colorClass: "from-amber-100 to-amber-200 border-amber-400 text-amber-800"
    },
    {
      id: "professional",
      title: "المحترف الطموح (Talent Candidate)",
      requirement: "أكمل المستوى 3 في مقابلة العمل",
      icon: "💼",
      unlocked: completedLevels.includes(3),
      colorClass: "from-teal-100 to-teal-200 border-teal-400 text-teal-800"
    },
    {
      id: "officer",
      title: "المسافر الجريء (JFK Explorer)",
      requirement: "أكمل المستوى 4 لعبور الجوازات",
      icon: "✈️",
      unlocked: completedLevels.includes(4),
      colorClass: "from-sky-100 to-sky-200 border-sky-400 text-sky-850"
    },
    {
      id: "linguist",
      title: "عالم اللغويات (Duolingo Guru)",
      requirement: "أطلق جميع المستويات الـ 9 بنجاح",
      icon: "🌟",
      unlocked: unlockedLevel === 9,
      colorClass: "from-indigo-100 to-indigo-200 border-indigo-400 text-indigo-800"
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
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <span>🥇 أوسمة وشارات الكفاءة والتميز (Achievement Badges):</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BADGES.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-3xl border flex items-start gap-4 transition-all ${
                badge.unlocked
                  ? `bg-slate-50 hover:bg-slate-100/50 border-slate-200`
                  : "bg-slate-50/50 border-slate-100/80 opacity-50"
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${badge.unlocked ? 'bg-indigo-50 shadow-md' : 'bg-slate-200'}`}>
                {badge.unlocked ? badge.icon : "🔒"}
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold flex items-center gap-1.5 text-slate-800">
                  <span>{badge.title}</span>
                  {badge.unlocked ? (
                    <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full font-black">نشطة ✓</span>
                  ) : (
                    <span className="text-[8px] bg-slate-200 text-slate-500 px-1.5 py-0.2 rounded-full">محجوبة</span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-500">
                  {badge.unlocked ? "تم فتح الوسام بنجاح! أحسنت." : badge.requirement}
                </p>
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
