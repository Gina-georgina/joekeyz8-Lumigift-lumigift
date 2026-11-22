import { NextRequest, NextResponse } from "next/server";
import { processOccasionReminders } from "@/server/services/occasion.service";
import type { ApiResponse } from "@/types";
import { isAuthorizedCronRequest } from "@/server/cron-auth";

/**
 * GET /api/v1/cron/occasion-reminders
 *
 * Called daily at 09:00 WAT (08:00 UTC) by Vercel Cron (see vercel.json).
 * Sends an SMS/email reminder 7 days and 1 day before each saved occasion
 * with reminders enabled (issue #341, extended for #519).
 */
export const GET = async (req: NextRequest) => {
  if (!isAuthorizedCronRequest(req.headers.get("authorization"))) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const sent = await processOccasionReminders();
    console.log("[cron/occasion-reminders] run complete", { sent });
    return NextResponse.json<ApiResponse<{ sent: number }>>({ success: true, data: { sent } });
  } catch (err) {
    console.error("[cron/occasion-reminders] run failed", { error: err });
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Occasion reminder job failed" },
      { status: 500 }
    );
  }
};
