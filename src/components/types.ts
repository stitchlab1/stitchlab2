export interface Persona {
  id: string;
  name: string;
  role: string;
  arabicName: string;
  arabicRole: string;
  avatar: string;
  emoji: string;
  starterMessage: string;
  starterMessageTranslation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  translation?: string;
  feedback?: string;
  vocabularySuggestions?: Array<{
    word: string;
    meaning: string;
    example: string;
  }>;
  timestamp: string;
}

export interface DailyQuote {
  quote: string;
  author: string;
  translation: string;
}

export interface Flashcard {
  id: string;
  word: string;
  ipa: string; // Phonics helper
  partOfSpeech: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: "Beginner" | "Intermediate" | "Advanced";
}

export const PRESET_PERSONAS: Persona[] = [
  {
    id: "linda",
    name: "Linda (London Peer)",
    role: "A friendly coffee-shop peer from London who loves talking about daily life, movies, and travel.",
    arabicName: "ليندا (صديقة مقربة في لندن)",
    arabicRole: "صديقة ودودة تتحدث عن الحياة اليومية، الأفلام، السفر والهوايات بلغة مريحة.",
    avatar: "bg-pink-100 text-pink-600",
    emoji: "👩🏼‍🦳",
    starterMessage: "Hello! It's so nice to meet you. I'm just sitting in a cafe near Soho. How are you doing today?",
    starterMessageTranslation: "مرحباً! سررت بلقائك جداً. أنا جالسة الآن في مقهى بالقرب من سوهو. كيف حالك اليوم؟"
  },
  {
    id: "jack",
    name: "Jack (Job Interviewer)",
    role: "A polite but professional hiring manager at a technology firm testing your formal English skills.",
    arabicName: "جاك (مقابل عمل)",
    arabicRole: "مدير توظيف محترف ومؤدب يختبر مهاراتك اللغوية الرسمية وسيرتك المهنية.",
    avatar: "bg-blue-100 text-blue-600",
    emoji: "👨🏻‍💻",
    starterMessage: "Welcome to our company. Thank you for coming today. To start, could you please tell me about yourself and your background?",
    starterMessageTranslation: "أهلاً بك في شركتنا. شكراً لحضورك اليوم. للبدء، هل يمكنك تفضلاً إخباري عن نفسك وخبرتك المهنية؟"
  },
  {
    id: "adam",
    name: "Adam (Airport Officer)",
    role: "A strict passport control officer at JFK Airport Checking travel purposes, lodging, and duration.",
    arabicName: "آدم (ضابط جوازات المطار)",
    arabicRole: "ضابط جوازات صارم في مطار نيويورك يختبر مهارات التعامل مع السفر والإقامة ومستوى لغتك.",
    avatar: "bg-indigo-100 text-indigo-600",
    emoji: "👮‍♂️",
    starterMessage: "Good evening. Press your fingers here, please. What is the purpose of your visit to the United States today?",
    starterMessageTranslation: "مساء الخير. ضع بصمتك هنا تفضلاً. ما هو الغرض من زيارتك للولايات المتحدة اليوم؟"
  },
  {
    id: "sarah",
    name: "Sarah (Cafe Waitress)",
    role: "A cheerful waitress at a busy New York brunch cafe taking food and beverage orders dynamically.",
    arabicName: "سارة (نادلة المقاهي الودودة)",
    arabicRole: "نادلة مرحة ونشيطة في مطعم بنيويورك تأخذ طلبات الطعام والمشروبات وتساعدك في اختيار الأطباق.",
    avatar: "bg-emerald-100 text-emerald-600",
    emoji: "👩‍🍳",
    starterMessage: "Good morning! Welcome to Sunny Side Brunch. What can I get started for you today? Coffee, juice, or perhaps our famous pancakes?",
    starterMessageTranslation: "صباح الخير! أهلاً بك في فطور صني سايد. بمن يمكنني أن أبدأ لك اليوم؟ قهوة، عصير، أم البانكيك الشهير لدينا؟"
  }
];

export const DAILY_QUOTES: DailyQuote[] = [
  {
    quote: "The limits of my language mean the limits of my world.",
    author: "Ludwig Wittgenstein",
    translation: "حدود لغتي هي حدود عالمي."
  },
  {
    quote: "Language is wine upon the lips.",
    author: "Virginia Woolf",
    translation: "اللغة هي عسل منساب من الشفاه."
  },
  {
    quote: "A different language is a different vision of life.",
    author: "Federico Fellini",
    translation: "اللغة المختلفة هي رؤية مختلفة للحياة."
  },
  {
    quote: "Learning another language is like becoming another person.",
    author: "Haruki Murakami",
    translation: "تعلم لغة أخرى يشبه أن تصبح شخصاً آخر بوعي جديد."
  }
];

export const PRESET_FLASHCARDS: Flashcard[] = [
  // Beginner
  {
    id: "b1",
    word: "Appreciate",
    ipa: "/əˈpriː.ʃi.eɪt/",
    partOfSpeech: "verb",
    meaning: "يقدر / يمتن لـ",
    example: "I appreciate your help with my English conversation.",
    exampleTranslation: "أنا أقدر مساعدتك لي في المحادثة باللغة الإنجليزية.",
    level: "Beginner"
  },
  {
    id: "b2",
    word: "Opportunity",
    ipa: "/ˌɒp.əˈtʃuː.nə.ti/",
    partOfSpeech: "noun",
    meaning: "فرصة سانحة",
    example: "This application is a golden opportunity to learn English.",
    exampleTranslation: "هذا التطبيق هو فرصة ذهبية لتعلم اللغة الإنجليزية.",
    level: "Beginner"
  },
  {
    id: "b3",
    word: "Improve",
    ipa: "/ɪmˈpruːv/",
    partOfSpeech: "verb",
    meaning: "يُحسّن / يطوّر",
    example: "I practice English speaking daily to improve my voice.",
    exampleTranslation: "أتدرب على التحدث بالإنجليزية يومياً لأحسن صوتي.",
    level: "Beginner"
  },
  {
    id: "b4",
    word: "Confidence",
    ipa: "/ˈkɒn.fɪ.dəns/",
    partOfSpeech: "noun",
    meaning: "ثقة بالنفس / يقين",
    example: "Speaking with Linda boosted my speaking confidence.",
    exampleTranslation: "التحدث مع ليندا عزز ثقتي في التحدث بالإنجليزية.",
    level: "Beginner"
  },
  // Intermediate
  {
    id: "i1",
    word: "Accustomed",
    ipa: "/əˈkʌs.təmd/",
    partOfSpeech: "adjective",
    meaning: "معتاد على / مألوف لديه",
    example: "I am accustomed to waking up early to study English idioms.",
    exampleTranslation: "أنا معتاد على الاستيقاظ مبكراً لدراسة المصطلحات الإنجليزية.",
    level: "Intermediate"
  },
  {
    id: "i2",
    word: "Exaggerate",
    ipa: "/ɪɡˈzædʒ.ə.reɪt/",
    partOfSpeech: "verb",
    meaning: "يبالغ / يهوّل في الوصف",
    example: "Don't exaggerate your mistakes, failure is part of learning.",
    exampleTranslation: "لا تبالغ في أخطائك، فالفشل جزء من عملية التعلم.",
    level: "Intermediate"
  },
  {
    id: "i3",
    word: "Sufficient",
    ipa: "/səˈfɪʃ.ənt/",
    partOfSpeech: "adjective",
    meaning: "كافٍ / يفي بالغرض",
    example: "Thirty minutes of daily visual practice is sufficient.",
    exampleTranslation: "ثلاثون دقيقة من الممارسة البصرية اليومية كافية جداً.",
    level: "Intermediate"
  },
  {
    id: "i4",
    word: "Acknowledge",
    ipa: "/əkˈnɒl.ɪdʒ/",
    partOfSpeech: "verb",
    meaning: "يعترف بـ / يقرّ بوجود شيء",
    example: "You must acknowledge your weak spots to perfect them.",
    exampleTranslation: "يجب أن تعترف بنقاط ضعفك حتى تتمكن من إتقانها.",
    level: "Intermediate"
  },
  // Advanced
  {
    id: "a1",
    word: "Eloquence",
    ipa: "/ˈel.ə.kwəns/",
    partOfSpeech: "noun",
    meaning: "البلاغة / الفصاحة والطلاقة",
    example: "The politician spoke with grand eloquence and clarity.",
    exampleTranslation: "تحدث السياسي ببلاغة ووضوح رائعين.",
    level: "Advanced"
  },
  {
    id: "a2",
    word: "Ubiquitous",
    ipa: "/juːˈbɪk.wɪ.təs/",
    partOfSpeech: "adjective",
    meaning: "واسع الانتشار / كلي الوجود في كل مكان",
    example: "English has become a ubiquitous global language.",
    exampleTranslation: "لقد أصبحت اللغة الإنجليزية لغة عالمية واسعة الانتشار في كل مكان.",
    level: "Advanced"
  },
  {
    id: "a3",
    word: "Meticulous",
    ipa: "/məˈtɪk.jə.ləs/",
    partOfSpeech: "adjective",
    meaning: "دقيق للغاية / حريص جداً على التفاصيل",
    example: "She has a meticulous way of organizing her vocabulary cards.",
    exampleTranslation: "لديها طريقة دقيقة للغاية في تنظيم بطاقات الكلمات الخاصة بها.",
    level: "Advanced"
  },
  {
    id: "a4",
    word: "Acumen",
    ipa: "/ˈæk.jə.mən/",
    partOfSpeech: "noun",
    meaning: "الفطنة / قوة الملاحظة والدراية",
    example: "His business acumen helped him pass his interview with Jack.",
    exampleTranslation: "فطنته التجارية ساعدته في اجتياز مقابلته المهنية مع جاك بنجاح.",
    level: "Advanced"
  }
];

