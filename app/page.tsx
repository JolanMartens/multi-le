"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"; // 1. Import Clerk hooks

export default function HomePage() {
  const createLobby = useMutation(api.lobby.createLobby);
  const router = useRouter();

  // 2. Get the current user's data from Clerk
  const { user, isSignedIn } = useUser();

  const handleCreateGame = async () => {
    // Safety check: don't let them create a game if not logged in
    if (!user) return;

    try {
      // 3. Use their real first name instead of "Player 1"
      const newLobbyId = await createLobby({
        hostName: user.firstName || "Anonymous Player",
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
          Wordle<span className="text-primary">Run</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Speedrun against your friends.
        </p>
      </div>

      {/* 5. Show "Create Game" if logged in, otherwise force them to log in */}
      {isSignedIn ? (
        <Button onClick={handleCreateGame} size="lg" className="text-lg px-8">
          Create New Game
        </Button>
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
