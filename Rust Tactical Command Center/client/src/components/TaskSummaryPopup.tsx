import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/button'
import { apiRequest } from '../lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { getTaskIcon, getStatusIcon } from '@/lib/icons'
import { KitNeedsDisplay } from './KitNeedsDisplay'

interface TaskSummaryPopupProps {
  isVisible: boolean
  onClose: () => void
  task: any
  position: { x: number; y: number }
}

export default function TaskSummaryPopup({
  isVisible,
  onClose,
  task,
  position
}: TaskSummaryPopupProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const markStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const updateData = {
        status: data.status,
        completedAt: new Date().toISOString(),
        completedBy: "user"
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

  const handleMarkCompleted = () => {
    if (task) {
      markStatusMutation.mutate({ id: task.id, status: 'completed' })
    }
  }

  const handleMarkFailed = () => {
    if (task) {
      markStatusMutation.mutate({ id: task.id, status: 'failed' })
    }
  }

  if (!isVisible || !task) return null

  const pickupType = task.taskData?.pickupType
  const repairUpgradeType = task.taskData?.repairUpgradeType
  const requestedResources = task.taskData?.requestedResources
  const kitResources = task.taskData?.kitResources
  
  let taskIcon, taskLabel
  
  // Get icon from centralized system
  taskIcon = getTaskIcon(task.taskType, pickupType || repairUpgradeType)
  
  if (pickupType) {
    taskLabel = `${pickupType.charAt(0).toUpperCase() + pickupType.slice(1)} Needs Pickup`
  } else if (repairUpgradeType) {
    taskLabel = `${repairUpgradeType.charAt(0).toUpperCase() + repairUpgradeType.slice(1)}`
  } else if (requestedResources || task.taskType === 'request_resources') {
    // Handle both nested requestedResources and direct fields
    const resources = requestedResources || {
      wood: task.taskData?.wood || '',
      stone: task.taskData?.stone || '',
      metal: task.taskData?.metal || '',
      hqm: task.taskData?.hqm || ''
    }
    const resourcesList = Object.entries(resources)
      .filter(([_, amount]) => amount && parseInt(amount) > 0)
      .map(([resource, amount]) => `${resource}: ${amount}`)
      .join(', ')
    taskLabel = `Request Resources - ${resourcesList}`
  } else if (kitResources || task.taskType === 'stock_kits') {
    // Handle kit resources
    const kits = kitResources || {}
    const kitsList = Object.entries(kits)
      .filter(([_, amount]) => amount && parseInt(amount) > 0)
      .map(([kit, amount]) => `${kit}: ${amount}`)
      .join(', ')
    taskLabel = `Stock Kits - ${kitsList}`
  } else {
    taskLabel = 'Task'
  }

  return (
    <div
      className="fixed bg-gray-800 border border-orange-500 rounded text-white z-50 shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        minWidth: '240px',
        maxWidth: '300px'
      }}
    >
      {/* Content */}
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-1">
          {task.taskType === 'stock_kits' && kitResources ? (
            <KitNeedsDisplay kitResources={kitResources} size="sm" />
          ) : (
            <span className="text-xs">{taskIcon}</span>
          )}
          <span className="text-xs font-medium text-orange-300">Task:</span>
          <span className="text-sm text-white">{taskLabel}</span>
        </div>

        {task.notes && task.notes.trim() !== '' && !task.notes.includes('Express') && !task.notes.includes('Request Resources') && (
          <div>
            <p className="text-xs font-medium text-orange-300">Notes:</p>
            <p className="text-xs text-gray-300 break-words">{task.notes}</p>
          </div>
        )}

        {task.screenshots && task.screenshots.length > 0 && (
          <div>
            <p className="text-xs font-medium text-orange-300 mb-1">Screenshots:</p>
            <div className="grid grid-cols-3 gap-1">
              {task.screenshots.slice(0, 3).map((screenshot: string, index: number) => (
                <img
                  key={index}
                  src={screenshot}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-8 object-cover rounded border border-orange-500/30"
                />
              ))}
              {task.screenshots.length > 3 && (
                <div className="w-full h-8 bg-gray-700 rounded border border-orange-500/30 flex items-center justify-center">
                  <span className="text-xs text-gray-400">+{task.screenshots.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1 p-2 border-t border-orange-500/30">
        <Button
          onClick={handleMarkCompleted}
          disabled={markStatusMutation.isPending}
          className="bg-green-600 hover:bg-green-700 text-xs h-6 flex-1"
          size="sm"
        >
          Mark Completed
        </Button>
        <Button
          onClick={handleMarkFailed}
          disabled={markStatusMutation.isPending}
          className="bg-yellow-600 hover:bg-yellow-700 text-xs h-6 px-2"
          size="sm"
        >
          Failed
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="border-orange-500 text-orange-400 hover:bg-orange-500/20 text-xs h-6 px-2"
          size="sm"
        >
          Close
        </Button>
      </div>
    </div>
  )
}