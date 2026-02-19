"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { use, useEffect } from "react";
import { useUser, SignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Notice we changed params.id to params.code to match the new folder name!
export default function LobbyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);

  const kickPlayer = useMutation(api.lobby.kickPlayer);

  const router = useRouter();
  const leaveLobby = useMutation(api.lobby.leaveLobby);

  // 1. Get Clerk user state
  const { user, isLoaded, isSignedIn } = useUser();

  // 2. Fetch Lobby by the short code from the URL
  const lobby = useQuery(api.lobby.getLobbyByCode, {
    shortCode: resolvedParams.code,
  });
  const joinLobby = useMutation(api.lobby.joinLobby);

  // 3. The Auto-Join Logic
  useEffect(() => {
    if (lobby && isSignedIn && user) {
      const playerName = user.firstName || "Anonymous";

      // 1. If the host left and canceled the lobby, boot everyone to the homepage
      if (lobby.status === "canceled") {
        router.push("/");
        return;
      }

      // 2. If this specific user was kicked (or left voluntarily), boot them
      if (lobby.kickedPlayers?.includes(playerName)) {
        router.push("/");
        return;
      }

      // 3. Normal auto-join for new players
      if (!lobby.players.includes(playerName)) {
        joinLobby({ lobbyId: lobby._id, playerName });
      }
    }
  }, [lobby, isSignedIn, user, joinLobby, router]);

  // Check if the currently logged-in user is the host
  const isHost = lobby?.host === user?.firstName;

  const handleKick = (playerName: string) => {
    if (lobby) {
      kickPlayer({ lobbyId: lobby._id, playerNameToRemove: playerName });
    }
  };

  const handleLeave = () => {
    if (lobby && user) {
      const playerName = user.firstName || "Anonymous";
      leaveLobby({ lobbyId: lobby._id, playerName });
      router.push("/"); // Instantly send the person clicking it back home
    }
  };

  // --- RENDERING STATES ---

  // State 1: Clerk is figuring out if they are logged in
  if (!isLoaded) return <div className="p-10 font-bold">Loading Auth...</div>;

  // State 2: User is NOT logged in. Force them to log in here.
  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        {/* forceRedirectUrl ensures they come right back to this lobby after logging in */}
        <SignIn
          forceRedirectUrl={`/lobby/${resolvedParams.code}`}
          routing="hash"
        />
      </div>
    );
  }

  // State 3: Waiting for Convex to find the lobby
  if (lobby === undefined)
    return <div className="p-10 font-bold">Loading Lobby...</div>;

  // State 4: Lobby doesn't exist (someone typed a bad code)
  if (lobby === null)
    return <div className="p-10 font-bold text-red-500">Lobby not found!</div>;

  // State 5: Everything is loaded!
  return (
    <div className="flex flex-col gap-4 p-10 max-w-xl mx-auto mt-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Game Lobby</h1>
        <div className="flex gap-4 items-center">
          <div className="bg-primary text-primary-foreground px-4 py-1 rounded-md text-xl font-mono tracking-widest">
            {lobby.shortCode}
          </div>
          <Button variant="destructive" onClick={handleLeave}>
            Leave
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground">Status: {lobby.status}</p>

      <div className="border p-6 rounded-lg shadow-sm bg-card mt-4">
        <h2 className="text-xl font-semibold mb-4">
          Players Joined ({lobby.players.length}):
        </h2>
        <ul className="flex flex-col gap-2">
          {lobby.players.map((player: string, index: number) => (
            <li
              key={index}
              className="px-4 py-2 bg-secondary rounded-md font-medium flex justify-between items-center"
            >
              <span>
                {player} {player === lobby.host && "👑"}
              </span>

              {/* Only the host sees the Kick button, and they can't kick themselves */}
              {isHost && player !== lobby.host && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleKick(player)}
                >
                  Kick
                </Button>
              )}
            </li>
          ))}
        </ul>

        {/* Start Game Button (Only Host sees this) */}
        {isHost && (
          <Button
            className="w-full mt-6"
            size="lg"
            onClick={() => alert("Start Game logic goes here!")}
          >
            Start Game
          </Button>
        )}
      </div>
    </div>
  );
}
