import { db } from "@/db";
import { attendance } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function autoEndExpiredShifts() {
  try {
    const now = new Date();
    
    // Get all IN_PROGRESS shifts
    const activeShifts = await db.query.attendance.findMany({
      where: eq(attendance.status, "IN_PROGRESS"),
    });

    let autoEndedCount = 0;

    for (const shift of activeShifts) {
      const shiftStart = new Date(shift.shiftStartTime);
      
      // Get midnight of the day after shift started
      const midnightAfterShift = new Date(shiftStart);
      midnightAfterShift.setHours(24, 0, 0, 0);
      
      // If current time is past midnight, auto-end the shift
      if (now >= midnightAfterShift) {
        const duration = Math.floor(
          (midnightAfterShift.getTime() - shiftStart.getTime()) / (1000 * 60)
        );

        await db
          .update(attendance)
          .set({
            shiftEndTime: midnightAfterShift,
            totalDuration: duration,
            endActivity: "Shift automatically ended at midnight - Not ended manually",
            dailyTasks: shift.dailyTasks || ["Auto-ended at midnight - No tasks entered"],
            status: "AUTO_COMPLETED",
            updatedAt: now,
          })
          .where(eq(attendance.id, shift.id));

        autoEndedCount++;
        console.log(`Auto-ended shift for user ${shift.userId} at midnight`);
      }
    }

    return {
      success: true,
      autoEndedCount,
      timestamp: now.toISOString(),
    };
  } catch (error) {
    console.error("Error auto-ending expired shifts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
