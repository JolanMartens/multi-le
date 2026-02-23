// app/admin/page.tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

//TODO: Move this to a config file or environment variable. Not a secury risk tho.
const ADMIN_USER_ID = "user_39tAgbbp5T1RKVStVJOsgvU8geI";

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const pendingWords = useQuery(api.lobby.getPendingReportedWords);
  const approveWord = useMutation(api.lobby.approveReportedWord);
  const removeReportWord = useMutation(api.lobby.removeReportWord);
  const bannedWords = useQuery(api.lobby.getBannedWords);

  // Security Check: Redirect non-admins
  useEffect(() => {
    if (isLoaded && (!user || user.id !== ADMIN_USER_ID)) {
      router.replace("/");
    }
  }, [user, isLoaded, router]);

  // Don't render anything while checking auth or if they aren't the admin
  if (!isLoaded || !user || user.id !== ADMIN_USER_ID) {
    return null;
  }

  return (
    <div className="flex flex-col w-full items-center justify-center gap-6 p-10">
      <h1 className="text-4xl font-extrabold tracking-tight">
        Admin Dashboard
      </h1>
      <Tabs
        defaultValue="ReportedWords"
        className="w-full inline-flex items-center justify-center"
      >
        <TabsList className="inline-flex items-center justify-center">
          <TabsTrigger value="ReportedWords">Reported Words</TabsTrigger>
          <TabsTrigger value="BannedWords">Banned Words</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="ReportedWords">
          <div className="flex flex-col gap-4 mt-4">
            {pendingWords === undefined && <p>Loading reports...</p>}
            {pendingWords !== undefined && pendingWords.length === 0 && (
              <p className="text-green-500 font-medium">
                No pending reports! You're all caught up.
              </p>
            )}

            {pendingWords?.map((report) => (
              <div
                key={report._id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card gap-12"
              >
                <div>
                  <p className="text-lg font-bold uppercase tracking-widest">
                    {report.word}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reported by: {report.reporter}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="hover:bg-red-700"
                    variant="destructive"
                    onClick={() => approveWord({ reportId: report._id })}
                  >
                    Approve (Ban Word)
                  </Button>
                  <Button
                    className="border-green-500 border-1 hover:bg-green-100 text-green-600 hover:text-green-600"
                    variant="outline"
                    onClick={() => removeReportWord({ reportId: report._id })}
                  >
                    Remove Report
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="BannedWords">
          <div className="flex flex-col gap-4 mt-4">
            {bannedWords === undefined && <p>Loading reports...</p>}
            {bannedWords !== undefined && bannedWords.length === 0 && (
              <p className="text-green-500 font-medium">No banned words!</p>
            )}

            {bannedWords?.map((report) => (
              <div
                key={report._id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card gap-12"
              >
                <div>
                  <p className="text-lg font-bold uppercase tracking-widest">
                    {report.word}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reported by: {report.reporter}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="hover:bg-red-700"
                    variant="destructive"
                    onClick={() => removeReportWord({ reportId: report._id })}
                  >
                    Unban Word
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="reports">
          <h4>Nothing to see here</h4>
        </TabsContent>
      </Tabs>
    </div>
  );
}
