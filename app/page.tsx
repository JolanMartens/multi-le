"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"; // 1. Import Clerk hooks
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const createLobby = useMutation(api.lobby.createLobby);
  const router = useRouter();

  // get the current user's data from Clerk
  const { user, isSignedIn } = useUser();

  const [joinCode, setJoinCode] = useState("");

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
        hostName: user.firstName || "Anonymous Player",
      });

      router.push(`/lobby/${newLobbyId}`);
    } catch (error) {
      console.error("Failed to create lobby:", error);
    }
  };

  // const handleJoinGame = async () => {
  //   if (!user) return;

  //   try {
  //   } catch (error) {
  //     console.error("Failed to join lobby:", error);
  //   }
  // };

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
          Speedrun famous <b>-le</b> type game against your friends.
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

      {/* 5. Show Create/Join if logged in, otherwise force login */}
      {isSignedIn ? (
        <div className="flex flex-col gap-4 items-center">
          <Button
            onClick={handleCreateGame}
            size="lg"
            className="text-lg px-8 w-full"
          >
            Create New Game
          </Button>

          <div className="flex items-center gap-2 mt-4">
            <Input
              placeholder="Enter code"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="uppercase w-48 text-center text-lg tracking-widest"
            />
            <Button onClick={handleJoinGame} variant="secondary" size="lg">
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
