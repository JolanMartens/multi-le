"use client";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function LobbyPage({ params }) {
  // This variable automatically changes when someone joins!
  const lobby = useQuery(api.lobby.getLobby, { lobbyId: params.id });

  if (!lobby) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-4 p-10">
      <h1 className="text-2xl font-bold">Lobby: {lobby.status}</h1>

      <div className="border p-4 rounded">
        <h2>Players Joined:</h2>
        <ul>
          {lobby.players.map((player) => (
            <li key={player}>{player}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
