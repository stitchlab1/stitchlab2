import React, { useEffect, useRef } from 'react';

/**
 * AdsterraBanner - A highly stable component for rendering Adsterra partner advertisements.
 * This encapsulates the dynamic script injection to ensure that any state changes or re-renders
 * in the parent components (like study timer updates, modal states) do NOT mutate or destroy 
 * the loaded advertisement iframe, effectively solving any flickering or disappearing issues.
 */
export const AdsterraBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only execute on browser/client-side and when container ref is ready
    if (!containerRef.current) return;

    // 1. Fully clear any previous container elements to prevent duplications
    containerRef.current.innerHTML = '';

    // 2. Create the precise container with the required Adsterra ID
    const adContainer = document.createElement('div');
    adContainer.id = 'container-65b31b8cd460cca901140c6aee6e1b78';
    adContainer.className = 'w-full flex justify-center items-center min-h-[250px]';
    containerRef.current.appendChild(adContainer);

    // 3. Configure the global atOptions object required by Adsterra's invoke.js script
    (window as any).atOptions = {
      key: '65b31b8cd460cca901140c6aee6e1b78',
      format: 'iframe',
      height: 250,
      width: 300,
      params: {}
    };

    // 4. Create and configure the invocation script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://pl29689018.effectivecpmnetwork.com/65b31b8cd460cca901140c6aee6e1b78/invoke.js';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    // 5. Append the script directly inside the adContainer so it loads relative to it
    adContainer.appendChild(script);

    return () => {
      // Cleanup the generated DOM elements on unmount to prevent leaks or orphan frames
      if (adContainer) {
        adContainer.innerHTML = '';
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full flex justify-center items-center overflow-hidden"
      style={{ minHeight: '250px' }}
    />
  );
};

export default AdsterraBanner;
