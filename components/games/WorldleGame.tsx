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
  const reportWord = useMutation(api.lobby.reportWord);

  // State to track if the word has been reported
  const [reported, setReported] = useState(false);

  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportProgress, setReportProgress] = useState(100);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    if (isGameOver && !reported) {
      setShowReportPopup(true);
      setReportProgress(100);

      const duration = 10000; // 10 seconds
      const startTime = Date.now();

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainingPercentage = Math.max(
          0,
          100 - (elapsed / duration) * 100,
        );

        setReportProgress(remainingPercentage);

        // Hide popup and clear interval when time is up
        if (elapsed >= duration) {
          setShowReportPopup(false);
          clearInterval(interval);
        }
      }, 16); // ~60fps for a silky smooth progress bar

      return () => clearInterval(interval);
    }
  }, [isGameOver, reported]);

  // 4. The Live Timer State
  const [timeStr, setTimeStr] = useState("0.0s");

  useEffect(() => {
    if (isGameOver) return; // Stop timer when they finish
    const interval = setInterval(() => {
      setTimeStr(((Date.now() - lobby.startTime) / 1000).toFixed(1) + "s");
    }, 100);
    return () => clearInterval(interval);
  }, [lobby.startTime, isGameOver]);

  const isHost = lobby.host === (user?.username || user?.id);

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
          <WorldMap />
        </div>
      </div>

      <div className="grid grid-rows-6 gap-2">
        <Input
          placeholder="Enter country name"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              //submitGuess();
            }
          }}
          className="uppercase w-70 text-center text-lg tracking-widest"
        />
      </div>

      {showReportPopup && !reported && (
        <div className="fixed bottom-6 right-6 z-50 w-64 bg-background border shadow-xl rounded-lg overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="p-4 flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground text-center">
              Notice a problem with this word?
            </p>
            <Button
              className="w-full font-bold hover:bg-red-500"
              variant="destructive"
              onClick={async () => {
                if (!user) return;
                await reportWord({
                  reporter: user.username || user.id,
                  reportedWord: lobby.targetWord,
                });
                setReported(true);
                setShowReportPopup(false); // Hide immediately on click
              }}
            >
              Report Movie
            </Button>
          </div>
          {/* The Timer Bar */}
          <div className="h-1.5 w-full bg-secondary">
            <div
              className="h-full bg-primary transition-none"
              style={{ width: `${reportProgress}%` }}
            />
          </div>
        </div>
      )}

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
          <div className="w-full max-w-md bg-secondary/30 p-4 rounded-lg border">
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
