import { Card, CardContent } from '@/components/ui/card';
import { Activity } from '@shared/schema';

interface ActivityFeedProps {
  activities: Activity[];
  isLoading: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  };

  const getActivityDotColor = (action: Activity['action']) => {
    return action === 'joined' ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <Card className="bg-surface border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
      </div>
      
      <CardContent className="p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-300">Loading activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Waiting for player activity...</p>
            <p className="text-xs text-gray-500 mt-2">
              Real-time join/leave events will appear here when players connect or disconnect.
            </p>
            <div className="flex justify-center mt-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3" data-testid={`activity-${activity.id}`}>
                  <div className={`w-2 h-2 ${getActivityDotColor(activity.action)} rounded-full mt-2 flex-shrink-0`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium text-white" data-testid={`text-activity-player-${activity.id}`}>
                        {activity.playerName}
                      </span>
                      <span data-testid={`text-activity-action-${activity.id}`}>
                        {activity.action === 'joined' ? ' joined the server' : ' left the server'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1" data-testid={`text-activity-time-${activity.id}`}>
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
