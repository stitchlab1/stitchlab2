import React from "react";
import { Award } from "lucide-react";

interface LearningLevel {
  number: number;
  title: string;
  englishTitle: string;
}

interface CertificatesWorkspaceProps {
  completedLevels: number[];
  userName: string;
  LEARNING_LEVELS: LearningLevel[];
}

export default function CertificatesWorkspace({
  completedLevels,
  userName,
  LEARNING_LEVELS
}: CertificatesWorkspaceProps) {
  return (
    <div id="certificates-empty-container" className="max-w-md mx-auto text-center space-y-6 py-12 animate-fadeIn" dir="rtl">
      <div id="certificates-icon-wrapper" className="w-20 h-20 bg-gradient-to-tr from-amber-100 to-amber-200 border border-amber-300 text-amber-800 rounded-3xl flex items-center justify-center mx-auto shadow-sm text-3xl">
        🎓
      </div>
      
      <div id="certificates-text-block" className="space-y-3 px-4">
        <h2 id="certificates-title" className="text-xl font-black text-amber-950 font-serif">قسم الشهادات</h2>
        <p id="certificates-subtitle" className="text-slate-600 text-sm md:text-base leading-relaxed font-bold bg-white/50 p-6 border border-amber-100/50 rounded-2xl shadow-sm">
          تم إفراغ هذا القسم بناءً على طلبكم. نحن نعمل دائماً على تلبية تطلعاتكم وتخصيص تجربتكم وفق رغبتكم الفخمة.
        </p>
      </div>
    </div>
  );
}
