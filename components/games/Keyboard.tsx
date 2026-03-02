import { Button } from "@/components/ui/button";

const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["Enter", "z", "x", "c", "v", "b", "n", "m", "Backspace"],
];

export default function Keyboard({
  onKeyPress,
  guesses,
  targetWord,
}: {
  onKeyPress: (key: string) => void;
  guesses: string[];
  targetWord: string;
}) {
  // 1. Figure out the highest status for every key pressed so far
  const keyStatuses: Record<string, "green" | "yellow" | "gray"> = {};

  guesses.forEach((guess) => {
    const targetLetters: (string | null)[] = targetWord.split("");
    const guessLetters: (string | null)[] = guess.split("");
    const rowStatuses = Array(5).fill("gray");

    // Pass 1: Greens
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        rowStatuses[i] = "green";
        targetLetters[i] = null;
        guessLetters[i] = null;
      }
    }

    // Pass 2: Yellows
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] !== null) {
        const targetIdx = targetLetters.indexOf(guessLetters[i]);
        if (targetIdx !== -1) {
          rowStatuses[i] = "yellow";
          targetLetters[targetIdx] = null;
        }
      }
    }

    // Apply to overall key statuses (Green overrides Yellow overrides Gray)
    for (let i = 0; i < 5; i++) {
      const letter = guess[i];
      const status = rowStatuses[i];

      if (status === "green") {
        keyStatuses[letter] = "green";
      } else if (status === "yellow" && keyStatuses[letter] !== "green") {
        keyStatuses[letter] = "yellow";
      } else if (
        status === "gray" &&
        keyStatuses[letter] !== "green" &&
        keyStatuses[letter] !== "yellow"
      ) {
        keyStatuses[letter] = "gray";
      }
    }
  });

  // 2. Assign the visual colors based on that status map
  const getKeyColor = (key: string) => {
    if (key.length > 1)
      return "bg-secondary text-foreground hover:bg-secondary/80"; // Enter/Backspace

    const status = keyStatuses[key];
    if (status === "green") return "bg-green-500 text-white hover:bg-green-600";
    if (status === "yellow")
      return "bg-yellow-500 text-white hover:bg-yellow-600";
    if (status === "gray") return "bg-zinc-600 text-white hover:bg-zinc-700";

    return "bg-secondary text-foreground hover:bg-secondary/80"; // Default unused key
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg mx-auto">
      {KEY_ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 sm:gap-2">
          {row.map((key) => (
            <Button
              key={key}
              onClick={() => onKeyPress(key)}
              variant="secondary"
              className={`px-2 sm:px-4 py-6 font-bold uppercase transition-colors ${getKeyColor(key)} ${key.length > 1 ? "w-20" : "w-10 sm:w-12"}`}
            >
              {key === "Backspace" ? "⌫" : key}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
