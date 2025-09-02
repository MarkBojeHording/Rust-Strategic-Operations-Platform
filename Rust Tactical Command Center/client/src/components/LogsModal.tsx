import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { ReportPreview } from './ReportPreview'
import { Search, Filter, Calendar, User, MapPin } from 'lucide-react'
import type { Report } from '@shared/schema'

interface LogsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LogsModal({ isOpen, onClose }: LogsModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all')

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
    enabled: isOpen
  })

  // Filter and search reports
  const filteredReports = reports.filter(report => {
    // Type filter
    if (typeFilter !== 'all' && report.type !== typeFilter) return false
    
    // Outcome filter
    if (outcomeFilter !== 'all' && report.outcome !== outcomeFilter) return false
    
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const location = report.location as { gridX: number, gridY: number }
      const gridRef = location ? `${String.fromCharCode(65 + location.gridX)}${location.gridY}` : ''
      
      return (
        report.notes.toLowerCase().includes(searchLower) ||
        report.type.toLowerCase().includes(searchLower) ||
        report.outcome.toLowerCase().includes(searchLower) ||
        gridRef.toLowerCase().includes(searchLower) ||
        report.playerTags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }
    
    return true
  })

  // Sort by most recent first
  const sortedReports = filteredReports.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const getTypeOptions = () => {
    const types = [...new Set(reports.map(r => r.type))]
    return types.map(type => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) }))
  }

  const getOutcomeOptions = () => {
    const outcomes = [...new Set(reports.map(r => r.outcome))]
    return outcomes.map(outcome => ({ value: outcome, label: outcome.charAt(0).toUpperCase() + outcome.slice(1) }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-gray-900 border-2 border-orange-500 text-orange-50 shadow-2xl shadow-orange-800/50">
        <DialogHeader className="border-b border-orange-600/50 pb-3">
          <DialogTitle className="flex items-center gap-2 text-orange-400 font-mono text-lg tracking-wider">
            <Calendar className="w-5 h-5 text-orange-500" />
            [SYSTEM LOGS]
            <Badge className="ml-2 bg-orange-900/50 text-orange-300 border border-orange-600/50 font-mono">
              {sortedReports.length} ENTRIES
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Filters and Search */}
        <div className="flex gap-3 flex-wrap items-center border-b border-orange-500/40 pb-4 bg-gradient-to-r from-orange-900/30 to-gray-800 p-3 -mx-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500 w-4 h-4" />
            <Input
              placeholder="[SEARCH QUERY]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-2 border-orange-500/60 text-orange-100 placeholder-orange-500/80 font-mono focus:border-orange-400"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border-2 border-orange-500/60 bg-gray-800 text-orange-100 font-mono focus:border-orange-400"
          >
            <option value="all">ALL TYPES</option>
            {getTypeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-3 py-2 border-2 border-orange-500/60 bg-gray-800 text-orange-100 font-mono focus:border-orange-400"
          >
            <option value="all">ALL OUTCOMES</option>
            {getOutcomeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchTerm || typeFilter !== 'all' || outcomeFilter !== 'all') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setTypeFilter('all')
                setOutcomeFilter('all')
              }}
              className="bg-orange-800/40 border-2 border-orange-500 text-orange-100 hover:bg-orange-700/60 font-mono tracking-wide"
            >
              [CLEAR]
            </Button>
          )}
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 via-orange-950/20 to-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-orange-400 font-mono animate-pulse">[LOADING SYSTEM DATA...]</div>
            </div>
          ) : sortedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-orange-600/30 m-4 bg-orange-950/20">
              <Calendar className="w-12 h-12 text-orange-600 mb-4" />
              <div className="text-lg font-medium mb-2 text-orange-300 font-mono">[NO DATA FOUND]</div>
              <div className="text-orange-600/80 font-mono text-sm">
                {searchTerm || typeFilter !== 'all' || outcomeFilter !== 'all' 
                  ? '[ADJUST SEARCH PARAMETERS]'
                  : '[AWAITING SYSTEM ENTRIES]'
                }
              </div>
            </div>
          ) : (
            <div className="space-y-0 border-2 border-orange-500/60 m-2 bg-gray-800/90">
              {sortedReports.map((report) => (
                <ReportPreview 
                  key={report.id} 
                  report={report}
                  onViewReport={(report) => {
                    // For now, LogsModal doesn't have edit functionality
                    // This could be added later if needed
                    console.log('Report viewing not implemented in LogsModal:', report)
                  }}
                />
              ))}
            </div>
          )}
        </div>


      </DialogContent>
    </Dialog>
  )
}