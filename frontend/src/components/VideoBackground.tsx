import React, { useEffect, useRef } from 'react';

interface VideoBackgroundProps {
  src: string;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const fadingOutRef = useRef<boolean>(false);
  const opacityRef = useRef<number>(0);

  const setOpacity = (val: number) => {
    opacityRef.current = val;
    if (containerRef.current) {
      containerRef.current.style.opacity = val.toString();
    }
  };

  const animateFade = (target: number, duration: number, onComplete?: () => void) => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    
    const startOpacity = opacityRef.current;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const current = startOpacity + (target - startOpacity) * progress;
      setOpacity(current);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(frame);
      } else {
        rafIdRef.current = null;
        if (onComplete) onComplete();
      }
    };

    rafIdRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const remaining = video.duration - video.currentTime;
      
      // Start fade out 0.55s before end
      if (remaining <= 0.55 && !fadingOutRef.current) {
        fadingOutRef.current = true;
        animateFade(0, 250);
      }
    };

    const handleEnded = () => {
      setOpacity(0);
      setTimeout(() => {
        video.currentTime = 0;
        video.play().then(() => {
          fadingOutRef.current = false;
          animateFade(1, 250);
        });
      }, 100);
    };

    const handlePlay = () => {
      // Start fade in on first play
      if (video.currentTime === 0 && !fadingOutRef.current) {
        animateFade(1, 250);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed top-0 left-0 w-[115%] h-[115%] -translate-x-[7.5%] -translate-y-[7.5%] -z-10 transition-none will-change-[opacity]"
      style={{ opacity: 0 }}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        autoPlay
        className="w-full h-full object-cover object-top"
      />
      {/* Overlay to ensure readability */}
      <div className="absolute inset-0 bg-white/10" />
    </div>
  );
};

export default VideoBackground;
