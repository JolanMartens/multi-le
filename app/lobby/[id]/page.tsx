"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api"; // Notice the @/ shortcut here!
import { Id } from "@/convex/_generated/dataModel";
import { use } from "react"; // 1. Import 'use' from react

// 2. Tell TypeScript that params is a Promise
export default function LobbyPage({
  params,
}: {
  params: Promise<{ id: Id<"lobbies"> }>;
}) {
  // 3. Unwrap the params safely
  const resolvedParams = use(params);

  // 4. Use the unwrapped ID!
  const lobby = useQuery(api.lobby.getLobby, { lobbyId: resolvedParams.id });

  if (!lobby)
    return <div className="p-10 text-xl font-bold">Loading Lobby...</div>;

  return (
    <div className="flex flex-col gap-4 p-10 max-w-xl mx-auto mt-10">
      <h1 className="text-3xl font-bold tracking-tight">Game Lobby</h1>
      <p className="text-muted-foreground">Status: {lobby.status}</p>

      <div className="border p-6 rounded-lg shadow-sm bg-card">
        <h2 className="text-xl font-semibold mb-4">Players Joined:</h2>
        <ul className="flex flex-col gap-2">
          {lobby.players.map((player: string, index: number) => (
            <li key={index} className="px-4 py-2 bg-secondary rounded-md">
              {player}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
