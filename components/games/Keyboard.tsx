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
  const getKeyColor = (key: string) => {
    let status = "bg-secondary text-foreground";
    if (key.length > 1) return status; // Enter/Backspace

    for (const guess of guesses) {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === key) {
          if (targetWord[i] === key)
            return "bg-green-500 text-white hover:bg-green-600";
          if (
            targetWord.includes(key) &&
            status !== "bg-green-500 text-white hover:bg-green-600"
          ) {
            status = "bg-yellow-500 text-white hover:bg-yellow-600";
          } else if (status === "bg-secondary text-foreground") {
            status = "bg-zinc-600 text-white hover:bg-zinc-700";
          }
        }
      }
    }
    return status;
  };

  return (
    <div className="flex flex-col gap-2 mt-6 w-full max-w-lg mx-auto">
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
