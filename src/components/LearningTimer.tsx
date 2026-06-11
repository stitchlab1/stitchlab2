import React, { useState, useEffect } from "react";
import { Timer, ChevronRight } from "lucide-react";

interface LearningTimerProps {
  isLoggedIn: boolean;
}

export default function LearningTimer({ isLoggedIn }: LearningTimerProps) {
  const [seconds, setSeconds] = useState<number>(0);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Load initial value from localStorage if it exists, or start fresh
  useEffect(() => {
    const savedTime = localStorage.getItem("stitchlab_learning_timer_seconds");
    if (savedTime) {
      setSeconds(parseInt(savedTime, 10));
    }
  }, []);

  // Update timer every second only if student is logged in
  useEffect(() => {
    let interval: any = null;
    if (isLoggedIn) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          localStorage.setItem("stitchlab_learning_timer_seconds", next.toString());
          return next;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Format time as HH:MM:SS
  const formatTime = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  return (
    <div 
      id="learning-timer-widget"
      className="fixed bottom-24 right-4 z-40 sm:bottom-6 sm:right-6 transition-all duration-300 ease-in-out"
      dir="rtl"
    >
      {isCollapsed ? (
        // Collapased State: Sleek interactive small circle button
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-center p-3 bg-gradient-to-tr from-pink-600 to-purple-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20"
          title="فتح مؤقت التعلم"
        >
          <Timer className="w-5 h-5 animate-pulse" />
        </button>
      ) : (
        // Expanded State: Elegant Glassmorphism control card
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-pink-100 flex items-center gap-3 animate-fadeIn max-w-[280px]">
          {/* Collapse toggle button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-pink-50 rounded-lg text-slate-400 hover:text-pink-600 transition-colors cursor-pointer"
            title="تصغير المؤقت"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Time & Title Info */}
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold text-pink-600 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              مؤقت التعلم
            </span>
            <span className="text-sm font-extrabold text-slate-800 font-mono tracking-wider mt-0.5 select-all">
              {formatTime(seconds)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
