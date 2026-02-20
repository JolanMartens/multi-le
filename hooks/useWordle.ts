// hooks/useWordle.ts
import { useState, useEffect, useCallback } from "react";
import { ALLOWED_GUESSES } from "@/lib/words";

export const useWordle = (solution: string) => {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Wrap the core logic in a reusable function
  const onKeyPress = useCallback((key: string) => {
    if (isGameOver) return;
    if (errorMsg) setErrorMsg(""); 

    if (key === "Enter") {
      if (currentGuess.length !== 5) return;
      if (!ALLOWED_GUESSES.includes(currentGuess.toLowerCase())) {
        setErrorMsg("Not in word list");
        return;
      }
      
      const newGuesses = [...guesses, currentGuess.toLowerCase()];
      setGuesses(newGuesses);
      
      if (currentGuess.toLowerCase() === solution.toLowerCase()) {
        setIsGameWon(true);
        setIsGameOver(true);
      } else if (newGuesses.length === 6) {
        setIsGameOver(true); // Failed
      }
      setCurrentGuess(""); 
      return;
    }

    if (key === "Backspace") {
      setCurrentGuess((prev) => prev.slice(0, -1));
      return;
    }

    if (/^[A-Za-z]$/.test(key) && key.length === 1) {
      if (currentGuess.length < 5) {
        setCurrentGuess((prev) => prev + key.toLowerCase());
      }
    }
  }, [currentGuess, isGameOver, solution, guesses, errorMsg]);

  // Physical keyboard listener calls the reusable function
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => onKeyPress(e.key);
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, [onKeyPress]);

  return { guesses, currentGuess, isGameOver, isGameWon, errorMsg, onKeyPress };
};