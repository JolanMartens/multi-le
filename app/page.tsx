"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"; // 1. Import Clerk hooks
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const getRowColors = (guess: string, target: string) => {
  const colors = Array(5).fill("bg-zinc-500 text-white border-zinc-500");
  if (!guess) return colors;

  const targetLetters: (string | null)[] = target.split("");
  const guessLetters: (string | null)[] = guess.split("");

  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      colors[i] = "bg-green-500 text-white border-green-500";
      targetLetters[i] = null;
      guessLetters[i] = null;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] !== null) {
      const targetIdx = targetLetters.indexOf(guessLetters[i]);
      if (targetIdx !== -1) {
        colors[i] = "bg-yellow-500 text-white border-yellow-500";
        targetLetters[targetIdx] = null;
      }
    }
  }
  return colors;
};

export default function HomePage() {
  const createLobby = useMutation(api.lobby.createLobby);
  const router = useRouter();

  // Get the list of public lobbies
  const publicLobbies = useQuery(api.lobby.getPublicLobbies);

  // get the current user's data from Clerk
  const { user, isSignedIn } = useUser();

  const [joinCode, setJoinCode] = useState("");
  const [showMyGrid, setShowMyGrid] = useState(false);

  // Daily Queries
  const dailyLeaderboard = useQuery(api.daily.getTodayLeaderboard);
  const myDailyScore = useQuery(api.daily.getUserTodayScore, {
    playerName: user?.username || user?.id || "",
  });

  const handleJoinGame = () => {
    if (joinCode.trim().length === 6) {
      router.push(`/lobby/${joinCode.toUpperCase()}`);
    }
  };

  const handleCreateGame = async () => {
    // Safety check: don't let them create a game if not logged in
    if (!user) return;

    try {
      const newLobbyId = await createLobby({
        hostName: user.username || user.id, // Use username if available, otherwise fallback to user ID
      });

      router.push(`/lobby/${newLobbyId}`);
    } catch (error) {
      console.error("Failed to create lobby:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-10 bg-background relative">
      {/* 4. Drop in the Profile Picture / Login button in the top right */}
      <div className="absolute top-6 right-6">
        {isSignedIn ? <UserButton afterSignOutUrl="/" /> : null}
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-5xl font-extrabold tracking-tight">
          Multi<span className="text-primary">-LE</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Play famous <b>-le</b> type games against your friends.
        </p>
        <div className="flex h-5 items-center gap-4 text-sm justify-center">
          <p>Wordle</p>
          <Separator orientation="vertical" />
          <p>Statele</p>
          <Separator orientation="vertical" />
          <p>Worldle</p>
          <Separator orientation="vertical" />
          <p>Framed</p>
          <Separator orientation="vertical" />
          <p>Moviedle</p>
        </div>
      </div>

      {/* Show Create/Join if logged in, otherwise force login */}
      {isSignedIn ? (
        <div className="flex flex-col gap-4 items-center">
          <ButtonGroup className="w-full">
            <Button
              onClick={handleCreateGame}
              size="lg"
              className="text-lg px-8"
            >
              Create New Game
            </Button>
            {/* DAILY MODAL TRIGGER */}
            <Dialog onOpenChange={(isOpen) => !isOpen && setShowMyGrid(false)}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 border-gray-500 font-semibold hover:bg-gray-100 hover:text-gray-700"
                >
                  Daily
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Daily Wordle</DialogTitle>
                  <DialogDescription>
                    Everyone gets the same word today. Can you beat the clock?
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                  {/* PLAY OR SHOW BUTTON */}
                  {myDailyScore === undefined ? (
                    <Button disabled className="w-full">
                      Loading...
                    </Button>
                  ) : myDailyScore === null ? (
                    <Button
                      size="lg"
                      className="w-full font-bold text-lg bg-green-600 hover:bg-green-500 text-white"
                      onClick={() => router.push("/daily")} // Assuming you will build this route!
                    >
                      Play Today's Word
                    </Button>
                  ) : (
                    <div className="flex flex-col items-center gap-4 border p-4 rounded-lg bg-secondary/20">
                      <p className="font-semibold text-center">
                        You{" "}
                        {myDailyScore.solved ? "solved it in" : "failed after"}{" "}
                        {myDailyScore.guesses.length} guesses!
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowMyGrid(!showMyGrid)}
                      >
                        {showMyGrid ? "Hide Grid" : "Show My Grid"}
                      </Button>

                      {/* MINI GRID RENDERING */}
                      {showMyGrid && (
                        <div className="grid grid-rows-6 gap-1 w-fit mx-auto mt-2">
                          {Array.from({ length: 6 }).map((_, rowIndex) => {
                            const rowWord =
                              rowIndex < myDailyScore.guesses.length
                                ? myDailyScore.guesses[rowIndex]
                                : "";
                            const rowColors = rowWord
                              ? getRowColors(rowWord, myDailyScore.targetWord)
                              : Array(5).fill("bg-zinc-800 border-zinc-700");

                            return (
                              <div
                                key={rowIndex}
                                className="grid grid-cols-5 gap-1"
                              >
                                {Array.from({ length: 5 }).map(
                                  (_, colIndex) => (
                                    <div
                                      key={colIndex}
                                      className={`w-8 h-8 border flex items-center justify-center text-sm font-bold uppercase ${rowColors[colIndex]}`}
                                    >
                                      {rowWord[colIndex] || ""}
                                    </div>
                                  ),
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LEADERBOARD */}
                  <div className="border rounded-lg shadow-sm bg-card overflow-hidden">
                    <div className="bg-muted px-4 py-2 border-b">
                      <h3 className="font-bold text-sm">Today's Leaderboard</h3>
                    </div>
                    <ul className="flex flex-col max-h-[250px] overflow-y-auto p-2 gap-1">
                      {dailyLeaderboard === undefined && (
                        <p className="text-center text-xs py-4">Loading...</p>
                      )}
                      {dailyLeaderboard?.length === 0 && (
                        <p className="text-center text-xs py-4 text-muted-foreground">
                          No one has played yet today!
                        </p>
                      )}

                      {dailyLeaderboard?.map((score, idx) => (
                        <li
                          key={score._id}
                          className="flex justify-between items-center p-2 rounded-md hover:bg-secondary/50 text-sm"
                        >
                          <span className="font-medium flex items-center gap-2">
                            <span className="text-muted-foreground w-4">
                              {idx + 1}.
                            </span>
                            {score.playerName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {score.solved
                              ? `${score.guesses.length} tries • ${(score.timeMs / 1000).toFixed(1)}s`
                              : "Failed"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </ButtonGroup>

          <div className="w-full max-w-sm">
            <div className="relative flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="shrink-0 px-2 text-muted-foreground text-xs uppercase">
                OR
              </span>
              <Separator className="flex-1" />
            </div>
          </div>

          <Dialog>
            {/* The Trigger is what opens the popup. asChild passes the click to your Button */}
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="text-lg px-8 w-full"
                variant="outline"
              >
                View Public Lobbies
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Public Lobbies</DialogTitle>
                <DialogDescription>
                  Select a public lobby below to join a game.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="py-4 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {/* STATE 1: Still fetching from Convex (undefined) */}
                  {publicLobbies === undefined && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Searching for games...
                    </p>
                  )}

                  {/* STATE 2: Finished fetching, but the array is empty */}
                  {publicLobbies !== undefined &&
                    publicLobbies.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No public lobbies open right now. Be the first to create
                        one!
                      </p>
                    )}

                  {/* STATE 3: We have lobbies! Map through the array. */}
                  {publicLobbies !== undefined &&
                    publicLobbies.length > 0 &&
                    publicLobbies.map((lobby) => (
                      // The wrapper for each individual lobby
                      <div
                        key={lobby._id}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => router.push(`/lobby/${lobby.shortCode}`)}
                      >
                        <div>
                          <p className="font-semibold">{lobby.host}'s Game</p>
                          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            {lobby.players.length}
                            <img
                              src={`/users.svg`}
                              alt=""
                              className="h-[1.5em] w-auto"
                            />
                            /
                            <img
                              src={`/${lobby.selectedGame}-logo.svg`}
                              alt=""
                              className="h-[2em] w-auto"
                            />
                          </p>
                        </div>
                        <Button size="sm" variant="secondary">
                          Join
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter code"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleJoinGame();
                }
              }}
              className="uppercase w-48 text-center text-lg tracking-widest"
            />
            <Button
              onClick={handleJoinGame}
              variant="secondary"
              size="lg"
              className="bg-blue-400 hover:bg-blue-300"
            >
              Join
            </Button>
          </div>
        </div>
      ) : (
        <SignInButton mode="modal">
          <Button size="lg" className="text-lg px-8">
            Log in to Play
          </Button>
        </SignInButton>
      )}
    </div>
  );
}
