import { db } from "./db";
import { reports } from "@shared/schema";
import { eq } from "drizzle-orm";

// Migration script to transform old report structure to new centralized format
export async function migrateExistingReports() {
  try {
    console.log("Starting report migration...");
    
    // Get all existing reports
    const existingReports = await db.select().from(reports);
    console.log(`Found ${existingReports.length} reports to migrate`);
    
    for (const oldReport of existingReports) {
      const content = oldReport.content as any;
      
      // Transform old structure to new structure
      const migratedData = {
        type: content.type === 'report-pvp' ? 'base' : 'general', // Map report types
        notes: content.notes || '',
        outcome: content.reportOutcome || 'neutral',
        playerTags: [], // Will populate from content.enemyPlayers and content.friendlyPlayers
        baseTags: content.baseId ? [content.baseId] : [],
        screenshots: [], // No screenshots in old format
        location: { gridX: 0, gridY: 0 }, // Will derive from location data
        createdBy: null, // Not tracked in old format
        completedBy: null,
        completedAt: null
      };
      
      // Parse player tags from comma-separated strings
      const enemyPlayers = content.enemyPlayers || '';
      const friendlyPlayers = content.friendlyPlayers || '';
      
      if (enemyPlayers) {
        const enemies = enemyPlayers.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        migratedData.playerTags.push(...enemies);
      }
      
      if (friendlyPlayers) {
        const friendlies = friendlyPlayers.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        migratedData.playerTags.push(...friendlies);
      }
      
      // Parse location from old format
      if (oldReport.locationName) {
        // Try to parse grid reference like "O5" -> {gridX: 14, gridY: 5}
        const gridMatch = oldReport.locationName.match(/^([A-Z])(\d+)$/);
        if (gridMatch) {
          const gridX = gridMatch[1].charCodeAt(0) - 65; // A=0, B=1, etc.
          const gridY = parseInt(gridMatch[2]);
          migratedData.location = { gridX, gridY };
        }
      }
      
      // Update the report with new structure
      await db.update(reports)
        .set(migratedData)
        .where(eq(reports.id, oldReport.id));
        
      console.log(`Migrated report ${oldReport.id}: ${content.type} -> ${migratedData.type}`);
    }
    
    console.log("Report migration completed successfully!");
  } catch (error) {
    console.error("Error during report migration:", error);
    throw error;
  }
}