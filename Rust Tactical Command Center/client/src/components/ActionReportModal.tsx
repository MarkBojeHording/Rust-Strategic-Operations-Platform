import { useState, useEffect } from "react"
import { X, Shield, MapPin } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"

const getColor = (type: string) => {
  if (type.startsWith("friendly")) return "text-green-400"
  if (type.startsWith("enemy")) return "text-red-400"
  return "text-yellow-400"
}

const getIcon = (type: string) => {
  return <Shield className="h-3 w-3" />
}

interface ActionReportModalProps {
  isVisible: boolean;
  onClose: () => void;
  baseId?: string;
  baseName?: string;
  baseCoords?: string;
  editingReport?: any;
}

export default function ActionReportModal({
  isVisible,
  onClose,
  baseId,
  baseName,
  baseCoords,
  editingReport,
}: ActionReportModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    type: 'report-pvp',
    reportTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    enemyPlayers: '',
    friendlyPlayers: '',
    notes: '',
    reportOutcome: 'neutral'
  })

  const [showFriendlyInput, setShowFriendlyInput] = useState(false)
  const [showEnemyInput, setShowEnemyInput] = useState(false)

  useEffect(() => {
    if (isVisible) {
      if (editingReport) {
        // Load existing report data for editing
        setFormData({
          type: editingReport.content?.type || 'report-pvp',
          reportTime: editingReport.content?.reportTime || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          enemyPlayers: editingReport.content?.enemyPlayers || '',
          friendlyPlayers: editingReport.content?.friendlyPlayers || '',
          notes: editingReport.content?.notes || '',
          reportOutcome: editingReport.content?.reportOutcome || 'neutral'
        })
      } else {
        // Reset form for new report
        setFormData({
          type: 'report-pvp',
          reportTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          enemyPlayers: '',
          friendlyPlayers: '',
          notes: '',
          reportOutcome: 'neutral'
        })
      }
      // Reset input visibility states
      setShowFriendlyInput(false)
      setShowEnemyInput(false)
    }
  }, [isVisible, editingReport])

  const createReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      console.log('Creating report with data:', reportData)
      const response = await apiRequest("POST", "/api/reports", reportData)
      console.log('Report creation response:', response)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
      // Also invalidate base-specific reports cache
      queryClient.invalidateQueries({ queryKey: ['/api/reports/base'] })
      onClose()
    },
    onError: (error) => {
      console.error('Report creation failed:', error)
    }
  })

  const handleSave = () => {
    if (createReportMutation.isPending) return // Prevent multiple submissions
    
    // Convert player strings to arrays
    const playerTags = []
    if (formData.enemyPlayers) {
      playerTags.push(...formData.enemyPlayers.split(',').map(p => p.trim()).filter(p => p))
    }
    if (formData.friendlyPlayers) {
      playerTags.push(...formData.friendlyPlayers.split(',').map(p => p.trim()).filter(p => p))
    }
    
    const reportData = {
      type: "base", // Report type for database
      notes: formData.notes || `${formData.type.replace('report-', '')} report at ${baseName || baseCoords}`,
      outcome: formData.reportOutcome,
      playerTags: playerTags,
      baseTags: baseId ? [baseId] : [],
      screenshots: [],
      location: baseCoords ? parseCoordinates(baseCoords) : { gridX: 0, gridY: 0 }
    }
    
    createReportMutation.mutate(reportData)
  }

  // Helper function to parse coordinates like "A1" to {gridX: 0, gridY: 1}
  const parseCoordinates = (coords: string) => {
    if (!coords) return { gridX: 0, gridY: 0 }
    const match = coords.match(/([A-Z])(\d+)/)
    if (match) {
      return {
        gridX: match[1].charCodeAt(0) - 65, // A=0, B=1, etc.
        gridY: parseInt(match[2])
      }
    }
    return { gridX: 0, gridY: 0 }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 10000 }}>
      <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-xl border border-gray-600 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h3 className="text-lg font-bold text-white mb-2">
          {editingReport ? "View/Edit Report" : "Create Report"}
        </h3>
        
        {baseId && (
          <div className="text-xs text-gray-400 font-mono mb-4 bg-gray-700 px-2 py-1 rounded border border-gray-600">
            Tagging to Base ID: {baseId}
          </div>
        )}
        
        <div>
          <div className="flex gap-4 items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-gray-200">Report Type</label>
              <div className="relative">
                <select 
                  value={formData.type} 
                  onChange={(e) => {
                    const newType = e.target.value
                    setFormData(prev => ({ 
                      ...prev, 
                      type: newType,
                      reportOutcome: newType === 'report-farming' ? 'lost' : newType === 'report-loaded' ? 'won' : 'neutral'
                    }))
                  }} 
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md appearance-none pr-16 text-gray-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="report-pvp">PVP General</option>
                  <option value="report-spotted">Spotted Enemy</option>
                  <option value="report-bradley">Countered/Took Bradley/Heli</option>
                  <option value="report-oil">Countered/Took Oil/Cargo</option>
                  <option value="report-monument">Big Score/Fight at Monument</option>
                  <option value="report-farming">Killed While Farming</option>
                  <option value="report-loaded">Killed Loaded Enemy</option>
                  <option value="report-raid">Countered Raid</option>
                </select>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center gap-1">
                  <div className={`${getColor(formData.type)} bg-gray-700 rounded p-0.5 border border-gray-600`}>
                    {getIcon(formData.type)}
                  </div>
                  <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-200">Time</label>
              <input 
                type="time" 
                value={formData.reportTime} 
                onChange={(e) => setFormData(prev => ({ ...prev, reportTime: e.target.value }))} 
                className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:border-blue-500 focus:outline-none" 
              />
            </div>
          </div>
          
          {/* Enemy and Friendly Player Containers */}
          <div className="flex gap-3 mb-4" style={{ height: '200px' }}>
            {/* Enemy Players Container */}
            <div className="flex-1 bg-gray-800 rounded-lg border border-gray-600 p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-red-400 font-medium text-sm">Enemy Players</h4>
                <button 
                  onClick={() => setShowEnemyInput(!showEnemyInput)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  {showEnemyInput ? 'Hide' : 'Add'}
                </button>
              </div>
              {showEnemyInput && (
                <input
                  type="text"
                  value={formData.enemyPlayers}
                  onChange={(e) => setFormData(prev => ({ ...prev, enemyPlayers: e.target.value }))}
                  placeholder="Enter enemy player names..."
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 placeholder-gray-500 mb-2 focus:outline-none focus:border-red-500"
                />
              )}
              <div className="overflow-y-auto max-h-32 text-xs text-gray-300">
                {formData.enemyPlayers.split(',').filter(name => name.trim()).map((name, index) => (
                  <div key={index} className="text-red-300 mb-1">{name.trim()}</div>
                ))}
              </div>
            </div>

            {/* Friendly Players Container */}
            <div className="flex-1 bg-gray-800 rounded-lg border border-gray-600 p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-green-400 font-medium text-sm">Friendly Players</h4>
                <button 
                  onClick={() => setShowFriendlyInput(!showFriendlyInput)}
                  className="text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  {showFriendlyInput ? 'Hide' : 'Add'}
                </button>
              </div>
              {showFriendlyInput && (
                <input
                  type="text"
                  value={formData.friendlyPlayers}
                  onChange={(e) => setFormData(prev => ({ ...prev, friendlyPlayers: e.target.value }))}
                  placeholder="Enter friendly player names..."
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 placeholder-gray-500 mb-2 focus:outline-none focus:border-green-500"
                />
              )}
              <div className="overflow-y-auto max-h-32 text-xs text-gray-300">
                {formData.friendlyPlayers.split(',').filter(name => name.trim()).map((name, index) => (
                  <div key={index} className="text-yellow-300 mb-1">{name.trim()}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1 text-gray-200">Notes</label>
            <textarea 
              value={formData.notes} 
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
              className="w-full h-24 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
              placeholder="Add report details..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={createReportMutation.isPending}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                createReportMutation.isPending 
                  ? 'bg-blue-400 text-gray-300 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {createReportMutation.isPending ? 'Saving...' : 'Save Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}