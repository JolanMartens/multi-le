import { useState, useEffect } from "react";
import { ALLOWED_GUESSES } from "@/lib/words"; // Import your allowed guesses!

export const useWordle = (solution: string) => {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // New state for "Not in word list"

  useEffect(() => {
    const handleKeyUp = ({ key }: KeyboardEvent) => {
      if (isGameOver) return;
      
      // Clear error message when they start typing again
      if (errorMsg) setErrorMsg(""); 

      if (key === "Enter") {
        if (currentGuess.length !== 5) return;
        
        // VALIDATE THE WORD!
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
          setIsGameOver(true); 
        }
        
        setCurrentGuess(""); 
        return;
      }

      if (key === "Backspace") {
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }

      if (/^[A-Za-z]$/.test(key)) {
        if (currentGuess.length < 5) {
          setCurrentGuess((prev) => prev + key.toLowerCase());
        }
      }
    };

    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, [currentGuess, isGameOver, solution, guesses, errorMsg]);

  return { guesses, currentGuess, isGameOver, isGameWon, errorMsg };
};