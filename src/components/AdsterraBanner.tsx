import React, { useEffect, useRef } from "react";

export default function AdsterraBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous elements to avoid duplicates
    containerRef.current.innerHTML = "";

    // Define option properties globally on window as Adsterra scripts look for window.atOptions
    (window as any).atOptions = {
      key: "e19dd79cfea257668bce6532879dbbd0",
      format: "iframe",
      height: 90,
      width: 728,
      params: {},
    };

    // Create the script element
    const script = document.createElement("script");
    script.src = "https://pl29694839.effectivecpmnetwork.com/e1/9d/d7/e19dd79cfea257668bce6532879dbbd0.js";
    script.setAttribute("data-cfasync", "false");
    script.type = "text/javascript";
    script.async = true;

    script.onload = () => {
      console.log("Adsterra script loaded successfully via standard div container.");
    };

    script.onerror = (e) => {
      console.warn("Failed to load Adsterra banner script:", e);
    };

    // Append script to container div
    containerRef.current.appendChild(script);

    return () => {
      try {
        delete (window as any).atOptions;
      } catch (e) {}
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <footer className="w-full max-w-md mx-auto mt-6 mb-24 px-4 flex flex-col items-center justify-center select-none" dir="rtl">
      <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-2.5 border border-pink-100 shadow-[0_8px_30px_rgba(236,72,153,0.04)] text-center relative overflow-hidden">
        <div className="text-[10px] font-extrabold text-pink-500 mb-2 tracking-tight flex items-center justify-center gap-1.5 select-none">
          <span>📢</span>
          <span>إعلان ممول لدعم استمرار المنصة مجاناً</span>
        </div>
        
        {/* Ad container using a standard direct div wrapper instead of an iframe */}
        <div 
          ref={containerRef}
          id="adsterra-banner-container"
          className="w-full min-h-[105px] flex items-center justify-center bg-pink-50/15 rounded-xl overflow-hidden transition-all duration-300"
          style={{ minHeight: "105px" }}
        />
      </div>
    </footer>
  );
}
