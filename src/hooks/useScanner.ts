import { useEffect, useRef } from 'react';

export function useScanner(onScan: (code: string) => void) {
  const buffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);
  const onScanRef = useRef(onScan);

  // Keep onScanRef up to date without triggering useEffect re-runs
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input and it's not a fast scan
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;
      lastKeyTime.current = currentTime;

      // Scanners are usually very fast (< 30ms between keys)
      const isScanner = timeDiff < 50;

      if (e.key === 'Enter') {
        // If we have a buffer and it was likely a scanner (or we are not in an input)
        if (buffer.current.length > 0) {
          // If it's an input, only trigger if it was fast (scanner)
          // If it's not an input, trigger anyway (global listener)
          if (!isInput || isScanner || buffer.current.length > 5) {
            onScanRef.current(buffer.current);
          }
          buffer.current = '';
        }
        return;
      }

      // Only add printable characters
      if (e.key.length === 1) {
        // If it's a human typing in an input, we don't want to steal the characters
        // but we can't really "stop" them from being added to the buffer here.
        // However, we can clear the buffer if the time difference is too large.
        if (timeDiff > 200) {
          buffer.current = '';
        }
        buffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array means this only runs once
}
