import { type Report } from "@shared/schema"
import { Button } from "./ui/button"
import { Camera, FileText, ExternalLink } from "lucide-react"
import { format } from "date-fns"

interface ReportPreviewProps {
  report: Report
  onViewReport?: (report: Report) => void
}

export function ReportPreview({ report, onViewReport }: ReportPreviewProps) {
  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'general': return 'General'
      case 'base': return 'Base'
      case 'action': return 'Action'
      default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  // Generate consistent alphanumeric ID from database ID
  const generateDisplayId = (dbId: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    // Use database ID as seed for consistent generation
    let seed = dbId
    let result = 'R'
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(seed % chars.length)
      seed = Math.floor(seed / chars.length) + (i * 7) // Add variation
    }
    return result
  }



  const hasScreenshots = report.screenshots && report.screenshots.length > 0
  const hasNotes = report.notes && report.notes.trim().length > 0

  return (
    <div className="flex items-center justify-between p-1 border-b border-orange-500/40 hover:bg-orange-900/40 transition-colors bg-gradient-to-r from-gray-800 to-orange-950/20">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {/* Report Type & ID */}
        <div className="flex flex-col min-w-0">
          <span className="font-mono text-xs text-orange-400 font-bold">[{getReportTypeLabel(report.type).toUpperCase()}]</span>
          <span className="text-xs text-orange-600 font-mono">{report.displayId || generateDisplayId(report.id)}</span>
        </div>

        {/* Content Indicators */}
        <div className="flex items-center gap-1 shrink-0">
          {hasScreenshots && <Camera className="w-3 h-3 text-orange-500" />}
          {hasNotes && <FileText className="w-3 h-3 text-orange-600" />}
        </div>

        {/* Notes Preview */}
        <div className="flex-1 min-w-0">
          <p className="text-xs truncate font-mono text-orange-200" title={report.notes}>
            {report.notes || "[NO DATA]"}
          </p>
        </div>





        {/* Timestamp */}
        <div className="text-xs text-orange-600 shrink-0 font-mono">
          {report.createdAt ? format(new Date(report.createdAt), 'MMM d, HH:mm') : 'No date'}
        </div>

        {/* Action Button */}
        {onViewReport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewReport(report)}
            className="shrink-0 h-6 w-6 p-0 hover:bg-orange-900/50 text-orange-400"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
}