import { storage } from "./storage";
import { db } from "./db";

// Standard report templates for different types of reports
const standardTemplates = [
  {
    name: "General Report",
    reportType: "general",
    template: {
      fields: [
        { name: "title", type: "text", label: "Report Title", required: true },
        { name: "description", type: "textarea", label: "Description", required: true },
        { name: "priority", type: "select", label: "Priority", options: ["low", "medium", "high", "critical"], required: true },
        { name: "tags", type: "tags", label: "Tags", required: false }
      ]
    }
  },
  {
    name: "Base Report", 
    reportType: "base",
    template: {
      fields: [
        { name: "title", type: "text", label: "Report Title", required: true },
        { name: "baseType", type: "select", label: "Base Type", options: ["friendly", "enemy", "neutral"], required: true },
        { name: "baseStatus", type: "select", label: "Base Status", options: ["active", "raided", "decaying", "abandoned"], required: true },
        { name: "description", type: "textarea", label: "Description", required: true },
        { name: "lootEstimate", type: "textarea", label: "Estimated Loot", required: false },
        { name: "defenses", type: "textarea", label: "Defenses Observed", required: false },
        { name: "raidCost", type: "textarea", label: "Estimated Raid Cost", required: false },
        { name: "priority", type: "select", label: "Priority", options: ["low", "medium", "high", "critical"], required: true },
        { name: "tags", type: "tags", label: "Tags", required: false }
      ]
    }
  },
  {
    name: "Task Report",
    reportType: "task", 
    template: {
      fields: [
        { name: "taskType", type: "select", label: "Task Type", options: ["needs_pickup"], required: true },
        { name: "status", type: "select", label: "Status", options: ["pending", "completed", "failed"], required: true },
        { name: "taskData", type: "json", label: "Task Data", required: false },
        { name: "description", type: "textarea", label: "Task Details", required: true },
        { name: "priority", type: "select", label: "Priority", options: ["low", "medium", "high", "critical"], required: true }
      ]
    }
  }
];

export async function seedReportTemplates() {
  try {
    // Create report_templates table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        template TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log("✓ Report templates table created/verified");
    for (const template of standardTemplates) {
      const existing = await storage.getReportTemplateByType(template.reportType);
      if (!existing) {
        await storage.createReportTemplate(template);
        console.log(`Created template: ${template.name}`);
      } else {
        console.log(`Template already exists: ${template.name}`);
      }
    }
    console.log("Report templates seeding completed");
  } catch (error) {
    console.error("Failed to seed report templates:", error);
  }
}