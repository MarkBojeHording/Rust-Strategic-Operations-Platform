import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Package, Pickaxe, Upload, ImageIcon, Trash2, Wrench, Construction } from 'lucide-react'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { apiRequest } from '../lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { KitIcon } from '@/components/ui/icon'

interface TaskReportModalProps {
  isVisible: boolean;
  onClose: () => void;
  baseId: string;
  baseName: string;
  baseCoords: string;
  editingReport?: any;
  taskType?: string;
  initialRepairType?: string;
}

export default function TaskReportModal({
  isVisible,
  onClose,
  baseId,
  baseName,
  baseCoords,
  editingReport,
  taskType,
  initialRepairType,
}: TaskReportModalProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const [selectedTaskType, setSelectedTaskType] = useState('needs_pickup')
  const [pickupType, setPickupType] = useState('')
  const [repairUpgradeType, setRepairUpgradeType] = useState('')
  const [requestedResources, setRequestedResources] = useState({
    wood: '',
    stone: '',
    metal: '',
    hqm: ''
  })
  const [kitResources, setKitResources] = useState({
    hazzy: '',
    fullkit: '',
    meds: '',
    bolty: '',
    teas: ''
  })
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isVisible) {
      if (editingReport) {
        // Load existing task report data for editing
        setSelectedTaskType(editingReport.taskType || 'needs_pickup')
        setPickupType(editingReport.taskData?.pickupType || '')
        setRepairUpgradeType(editingReport.taskData?.repairUpgradeType || '')
        // Load resource values from either nested requestedResources or direct fields
        const existingResources = editingReport.taskData?.requestedResources || {
          wood: editingReport.taskData?.wood || '',
          stone: editingReport.taskData?.stone || '',
          metal: editingReport.taskData?.metal || '',
          hqm: editingReport.taskData?.hqm || ''
        }
        setRequestedResources(existingResources)
        // Load kit resource values if they exist
        const existingKitResources = editingReport.taskData?.kitResources || {
          hazzy: '',
          fullkit: '',
          meds: '',
          bolty: '',
          teas: ''
        }
        setKitResources(existingKitResources)
        setScreenshots(editingReport.screenshots || [])
        setNotes(editingReport.notes || '')
      } else {
        // Reset form for new task report
        setSelectedTaskType(taskType || 'needs_pickup')
        setPickupType('')
        setRepairUpgradeType(initialRepairType || '')
        setRequestedResources({ wood: '', stone: '', metal: '', hqm: '' })
        setKitResources({ hazzy: '', fullkit: '', meds: '', bolty: '', teas: '' })
        setScreenshots([])
        setNotes('')
      }
    }
  }, [isVisible, editingReport, taskType, initialRepairType])

  // Generate consistent display ID
  const generateDisplayId = (dbId: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let seed = dbId
    let result = 'T' // T for Task
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(seed % chars.length)
      seed = Math.floor(seed / chars.length) + (i * 7)
    }
    return result
  }

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await apiRequest("POST", "/api/reports", taskData)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
      queryClient.invalidateQueries({ queryKey: ['/api/reports/base'] })
      toast({
        title: "Task Created",
        description: "Task report has been created successfully.",
      })
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task report. Please try again.",
        variant: "destructive",
      })
      console.error('Error creating task:', error)
    }
  })

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: number; taskData: any }) => {
      const response = await apiRequest("PUT", `/api/reports/${data.id}`, data.taskData)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
      queryClient.invalidateQueries({ queryKey: ['/api/reports/base'] })
      toast({
        title: "Task Updated",
        description: "Task report has been updated successfully.",
      })
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task report. Please try again.",
        variant: "destructive",
      })
      console.error('Error updating task:', error)
    }
  })

  const markStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const updateData = {
        status: data.status,
        completedAt: new Date().toISOString(),
        completedBy: "user" // Replace with actual user ID when auth is implemented
      }
      const response = await apiRequest("PUT", `/api/reports/${data.id}`, updateData)
      return response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
      queryClient.invalidateQueries({ queryKey: ['/api/reports/base'] })
      toast({
        title: "Task Updated",
        description: `Task marked as ${variables.status}.`,
      })
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      })
      console.error('Error updating task status:', error)
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/reports/${id}`)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
      queryClient.invalidateQueries({ queryKey: ['/api/reports/base'] })
      toast({
        title: "Task Deleted",
        description: "Task report has been deleted.",
      })
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete task report. Please try again.",
        variant: "destructive",
      })
      console.error('Error deleting task:', error)
    }
  })

  const handleSave = () => {
    if (!selectedTaskType) {
      toast({
        title: "Error",
        description: "Please select a task type.",
        variant: "destructive",
      })
      return
    }

    if (selectedTaskType === 'needs_pickup' && !pickupType) {
      toast({
        title: "Error",
        description: "Please select pickup type (Loot or Ore).",
        variant: "destructive",
      })
      return
    }

    if (selectedTaskType === 'repair_upgrade' && !repairUpgradeType) {
      toast({
        title: "Error",
        description: "Please select repair or upgrade option.",
        variant: "destructive",
      })
      return
    }

    let taskDataDetails = {}
    
    if (selectedTaskType === 'needs_pickup') {
      taskDataDetails = { pickupType }
    } else if (selectedTaskType === 'repair_upgrade') {
      taskDataDetails = { repairUpgradeType }
    } else if (selectedTaskType === 'request_resources') {
      taskDataDetails = { requestedResources }
    } else if (selectedTaskType === 'stock_kits') {
      taskDataDetails = { kitResources }
    }

    const taskData = {
      type: 'task',
      taskType: selectedTaskType,
      taskData: taskDataDetails,
      baseTags: [baseId],
      notes: notes,
      outcome: 'neutral',
      status: 'pending',
      location: { gridX: 0, gridY: 0 }, // Will be set by the location where base is placed
      screenshots: screenshots,
      enemyPlayers: '',
      friendlyPlayers: '',
      createdBy: "user" // Replace with actual user ID when auth is implemented
    }

    if (editingReport) {
      updateTaskMutation.mutate({ id: editingReport.id, taskData })
    } else {
      createTaskMutation.mutate(taskData)
    }
  }

  const handleMarkCompleted = () => {
    if (editingReport) {
      markStatusMutation.mutate({ id: editingReport.id, status: 'completed' })
    }
  }

  const handleMarkFailed = () => {
    if (editingReport) {
      markStatusMutation.mutate({ id: editingReport.id, status: 'failed' })
    }
  }

  const handleDelete = () => {
    if (editingReport && window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      deleteTaskMutation.mutate(editingReport.id)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] border border-orange-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-orange-400">
              {editingReport ? editingReport.displayId || generateDisplayId(editingReport.id) : 'New Task'}
            </h2>
            <p className="text-sm text-orange-600">{baseName} ({baseCoords})</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-orange-400 hover:text-orange-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Screenshot Upload Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-orange-300 mb-2">
            Screenshots (Optional)
          </label>
          <div className="border border-orange-500/40 rounded-lg p-3 bg-gray-900/30">
            {screenshots.length === 0 ? (
              <div className="text-center py-4">
                <ImageIcon className="h-8 w-8 mx-auto text-gray-500 mb-2" />
                <p className="text-sm text-gray-400 mb-3">No screenshots uploaded</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files)
                      newFiles.forEach(file => {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setScreenshots(prev => [...prev, event.target.result as string])
                          }
                        }
                        reader.readAsDataURL(file)
                      })
                    }
                  }}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label
                  htmlFor="screenshot-upload"
                  className="inline-flex items-center px-3 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded cursor-pointer"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload Screenshots
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-orange-300">{screenshots.length} screenshot{screenshots.length > 1 ? 's' : ''}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files)
                        newFiles.forEach(file => {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setScreenshots(prev => [...prev, event.target.result as string])
                            }
                          }
                          reader.readAsDataURL(file)
                        })
                      }
                    }}
                    className="hidden"
                    id="screenshot-upload-more"
                  />
                  <label
                    htmlFor="screenshot-upload-more"
                    className="inline-flex items-center px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded cursor-pointer"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Add More
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {screenshots.map((screenshot, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={screenshot}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-16 object-cover rounded border border-orange-500/30"
                      />
                      <button
                        onClick={() => setScreenshots(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task Type Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-orange-300 mb-2">
            Task Type
          </label>
          <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
            <SelectTrigger className="bg-gray-700 border-orange-500 text-white">
              <SelectValue placeholder="Select task type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="needs_pickup">Needs Pick up</SelectItem>
              <SelectItem value="repair_upgrade">Repair/Upgrade</SelectItem>
              <SelectItem value="request_resources">Request Resources</SelectItem>
              <SelectItem value="stock_kits">Stock Kits</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task-Specific Container */}
        {selectedTaskType === 'needs_pickup' && (
          <div className="mb-6 p-4 border border-orange-500/40 rounded-lg bg-gray-900/50">
            <h3 className="text-sm font-medium text-orange-300 mb-3">Pick up Options</h3>
            <div className="flex gap-3">
              <Button
                variant={pickupType === 'loot' ? 'default' : 'outline'}
                onClick={() => setPickupType('loot')}
                className={`flex-1 ${
                  pickupType === 'loot'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'border-orange-500 text-orange-400 hover:bg-orange-500/20'
                }`}
              >
                <Package className="h-4 w-4 mr-2" />
                Loot
              </Button>
              <Button
                variant={pickupType === 'ore' ? 'default' : 'outline'}
                onClick={() => setPickupType('ore')}
                className={`flex-1 ${
                  pickupType === 'ore'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'border-orange-500 text-orange-400 hover:bg-orange-500/20'
                }`}
              >
                <Pickaxe className="h-4 w-4 mr-2" />
                Ore
              </Button>
            </div>
          </div>
        )}

        {/* Repair/Upgrade Options */}
        {selectedTaskType === 'repair_upgrade' && (
          <div className="mb-6 p-4 border border-orange-500/40 rounded-lg bg-gray-900/50">
            <h3 className="text-sm font-medium text-orange-300 mb-3">Repair/Upgrade Options</h3>
            <div className="flex gap-3">
              <Button
                variant={repairUpgradeType === 'repair' ? 'default' : 'outline'}
                onClick={() => setRepairUpgradeType('repair')}
                className={`flex-1 ${
                  repairUpgradeType === 'repair'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'border-orange-500 text-orange-400 hover:bg-orange-500/20'
                }`}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Repair
              </Button>
              <Button
                variant={repairUpgradeType === 'upgrade' ? 'default' : 'outline'}
                onClick={() => setRepairUpgradeType('upgrade')}
                className={`flex-1 ${
                  repairUpgradeType === 'upgrade'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'border-orange-500 text-orange-400 hover:bg-orange-500/20'
                }`}
              >
                <Construction className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
            </div>
          </div>
        )}

        {selectedTaskType === 'request_resources' && (
          <div className="mb-6 p-4 border border-orange-500/40 rounded-lg bg-gray-900/50">
            <h3 className="text-sm font-medium text-orange-300 mb-3">Resource Amounts</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Wood</label>
                <Input
                  type="number"
                  value={requestedResources.wood}
                  onChange={(e) => setRequestedResources(prev => ({ ...prev, wood: e.target.value }))}
                  placeholder="0"
                  className="bg-gray-700 border-orange-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Stone</label>
                <Input
                  type="number"
                  value={requestedResources.stone}
                  onChange={(e) => setRequestedResources(prev => ({ ...prev, stone: e.target.value }))}
                  placeholder="0"
                  className="bg-gray-700 border-orange-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Metal</label>
                <Input
                  type="number"
                  value={requestedResources.metal}
                  onChange={(e) => setRequestedResources(prev => ({ ...prev, metal: e.target.value }))}
                  placeholder="0"
                  className="bg-gray-700 border-orange-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">HQM</label>
                <Input
                  type="number"
                  value={requestedResources.hqm}
                  onChange={(e) => setRequestedResources(prev => ({ ...prev, hqm: e.target.value }))}
                  placeholder="0"
                  className="bg-gray-700 border-orange-500 text-white"
                />
              </div>
            </div>
          </div>
        )}

        {selectedTaskType === 'stock_kits' && (
          <div className="mb-4 p-2 border border-orange-500/40 rounded-lg bg-gray-900/50">
            <div className="flex items-center justify-between gap-0.5">
              <div className="flex items-center gap-1">
                <KitIcon kitType="hazzy" size="xs" />
                <Input
                  type="number"
                  value={kitResources.hazzy}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 2);
                    setKitResources(prev => ({ ...prev, hazzy: value }));
                  }}
                  placeholder="0"
                  className="bg-gray-700 border-orange-500 text-white h-5 text-xs w-8 rounded-none px-0 text-center"
                  max="99"
                />
              </div>
              <div className="flex items-center gap-1">
                <KitIcon kitType="fullkit" size="xs" />
                <Input
                  type="number"
                  value={kitResources.fullkit}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 2);
                    setKitResources(prev => ({ ...prev, fullkit: value }));
                  }}
                  placeholder="0"
                  className="bg-gray-700 border-orange-500 text-white h-5 text-xs w-8 rounded-none px-0 text-center"
                  max="99"
                />
              </div>
              <div className="flex items-center gap-1">
                <KitIcon kitType="meds" size="xs" />
                <Input
                  type="number"
                  value={kitResources.meds}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 3);
                    setKitResources(prev => ({ ...prev, meds: value }));
                  }}
                  placeholder="0"
                  className="bg-gray-700 border-orange-500 text-white h-5 text-xs w-9 rounded-none px-0 text-center"
                  max="999"
                />
              </div>
              <div className="flex items-center gap-1">
                <KitIcon kitType="bolty" size="xs" />
                <Input
                  type="number"
                  value={kitResources.bolty}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 2);
                    setKitResources(prev => ({ ...prev, bolty: value }));
                  }}
                  placeholder="0"
                  className="bg-gray-700 border-orange-500 text-white h-5 text-xs w-8 rounded-none px-0 text-center"
                  max="99"
                />
              </div>
              <div className="flex items-center gap-1">
                <KitIcon kitType="teas" size="xs" />
                <Input
                  type="number"
                  value={kitResources.teas}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 2);
                    setKitResources(prev => ({ ...prev, teas: value }));
                  }}
                  placeholder="0"
                  className="bg-gray-700 border-orange-500 text-white h-5 text-xs w-8 rounded-none px-0 text-center"
                  max="99"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-orange-300 mb-2">
            Additional Notes (Optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional details, context, or instructions for this task..."
            className="bg-gray-700 border-orange-500/40 text-white placeholder-gray-400 min-h-[80px] resize-none"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            These notes will be saved with the task report for reference.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {editingReport ? (
            <>
              <Button
                onClick={handleSave}
                disabled={updateTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
              >
                Save
              </Button>
              <Button
                onClick={handleMarkCompleted}
                disabled={markStatusMutation.isPending}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                Mark Complete
              </Button>
              <Button
                onClick={handleMarkFailed}
                disabled={markStatusMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700 flex-1"
              >
                Mark Failed
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteTaskMutation.isPending}
                variant="destructive"
                className="flex-1"
              >
                Delete
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="border-orange-500 text-orange-400 hover:bg-orange-500/20"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleSave}
                disabled={createTaskMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 flex-1"
              >
                Save
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="border-orange-500 text-orange-400 hover:bg-orange-500/20 flex-1"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}