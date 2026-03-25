import { useState, useEffect } from 'react';

export function useTimer(isActiveInitially = true) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(isActiveInitially);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const resetTimer = () => setSeconds(0);

  return { 
    seconds, 
    setSeconds, 
    isActive, 
    setIsActive, 
    resetTimer 
  };
}
