"use client";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import "./worldleGame.css";
import WorldMap from "./WorldMap";
import { levenshtein, WORLDLE_ALLOWED_GUESSES } from "@/lib/countries";

export default function WorldleGame({
  lobby,
  onLeave,
}: {
  lobby: any;
  onLeave: () => void;
}) {
  const { user } = useUser();
  const submitScore = useMutation(api.lobby.submitScore);
  const endRound = useMutation(api.lobby.endRound);

  const [isRoundOver, setIsRoundOver] = useState(false);
  const [guesses, setGuesses] = useState<string[]>([]);

  // The Live Timer State
  const [timeStr, setTimeStr] = useState("0.0s");

  useEffect(() => {
    if (isRoundOver) return; // Stop timer when they finish
    const interval = setInterval(() => {
      setTimeStr(((Date.now() - lobby.startTime) / 1000).toFixed(1) + "s");
    }, 100);
    return () => clearInterval(interval);
  }, [lobby.startTime, isRoundOver]);

  useEffect(() => {
    if (isRoundOver && user) {
      submitScore({
        lobbyId: lobby._id,
        playerName: user.username || user.id,
        guesses: guesses.length,
        solved: isRoundOver,
      });
    }
  }, [isRoundOver]);

  const isHost = lobby.host === (user?.username || user?.id);

  const [errorMsg, setErrorMsg] = useState("");
  const target = lobby?.targetWord;
  const [guessedCountry, setGuessedCountry] = useState("");

  const guessCountry = () => {
    if (
      guessedCountry.trim().toLowerCase() === target.trim().toLowerCase() ||
      levenshtein(guessedCountry.toLowerCase(), target.toLowerCase()) <= 2
    ) {
      setErrorMsg("");
      const newGuesses = [...guesses, guessedCountry.toLowerCase()];
      setGuesses(newGuesses);
      setIsRoundOver(true);
    } else if (guesses.includes(guessedCountry.toLowerCase())) {
      setErrorMsg("Already guessed that country");
    } else if (
      guessedCountry.trim().toLowerCase() !== target.trim().toLowerCase()
    ) {
      setErrorMsg("Wrong, try again!");
      const newGuesses = [...guesses, guessedCountry.toLowerCase()];
      setGuesses(newGuesses);
    } else if (
      !WORLDLE_ALLOWED_GUESSES.includes(guessedCountry.toLowerCase())
    ) {
      console.log(guessedCountry.toLowerCase());
      setErrorMsg("Not a valid country");
    } else {
      setErrorMsg("What????, try again.");
    }
    setGuessedCountry("");
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4  w-full focus:outline-none">
      <div className="flex justify-between w-full max-w-md items-center">
        <h1 className="text-3xl font-bold tracking-tight">WorldleRun</h1>

        {/* The Live Timer UI */}
        <div className="text-2xl font-mono font-bold text-primary">
          {timeStr}
        </div>

        <Button variant="destructive" size="sm" onClick={onLeave}>
          Quit
        </Button>
      </div>

      {/* The Movie snake */}
      <div className="flex items-center">
        <div className="flex justify-between items-center ">
          <div className="map-container">
            {/* This dynamically creates the CSS rule for ONLY the current target */}
            {!isRoundOver && target && (
              <style>{`
                .${target.replace(/\s+/g, ".")} { 
                fill: #fffb00 !important; 
                filter: drop-shadow(0 0 15px #e5ff00);
                  }
              `}</style>
            )}
            {isRoundOver && target && (
              <style>{`
                .${target.replace(/\s+/g, ".")} { 
                fill: #00d32e !important; 
                filter: drop-shadow(0 0 15px #1eff00);
                  }
              `}</style>
            )}
            {guesses
              .filter((guess) => guess.toLowerCase() !== target?.toLowerCase())
              .map((guess) => (
                <style key={guess}>{`
                  .${guess.replace(/\s+/g, ".")} { 
                    fill: #ff0000 !important; 
                    filter: drop-shadow(0 0 2px #ff0000);
                  }
                `}</style>
              ))}
            <WorldMap />
          </div>
        </div>
      </div>

      <div className="grid grid-rows-6 gap-2">
        {errorMsg && (
          <div className="relative left-1/2 transform -translate-x-1/2 z-50 w-60 max-w-md px-4 text-center">
            <Alert className="font-bold bg-red-200 px-4 py-2 rounded-md shadow-lg border border-red-400">
              <AlertDescription className="text-red-500">
                {errorMsg}
              </AlertDescription>
            </Alert>
          </div>
        )}
        <Input
          autoFocus
          placeholder="Enter country name"
          value={guessedCountry}
          onChange={(e) => setGuessedCountry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              guessCountry();
            }
          }}
          className="uppercase w-70 text-center text-lg tracking-widest"
        />
      </div>

      {/* Host Control: End Round Manually */}
      {isHost && (
        <Button
          className="w-full max-w-md mt-4 font-bold"
          size="lg"
          onClick={() => endRound({ lobbyId: lobby._id })}
        >
          End Round & Return to Lobby
        </Button>
      )}
      <div className="fixed right-4 top-30 w-90 hidden xl:block">
        {lobby.scores && lobby.scores.length > 0 && (
          <div className="w-full max-w-md bg-secondary p-4 rounded-lg border">
            <h2 className="text-lg font-bold mb-2">Live Leaderboard</h2>
            <div className="flex flex-col gap-1">
              {lobby.scores.map((score: any, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-background p-2 rounded border-sm"
                >
                  <span className="font-semibold flex">
                    {index === 0 ? (
                      <p className="text-yellow-500 w-10">1st</p>
                    ) : index === 1 ? (
                      <p className="text-zinc-400 w-10">2nd</p>
                    ) : index === 2 ? (
                      <p className="text-amber-800 w-10">3rd</p>
                    ) : (
                      <p className="text-muted-foreground w-10">
                        {index + 1}th
                      </p>
                    )}{" "}
                    {score.playerName}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {score.solved
                      ? `${score.guesses} guesses • ${(score.timeMs / 1000).toFixed(2)}s`
                      : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
