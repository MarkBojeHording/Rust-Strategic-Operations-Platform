import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock, Calendar, TrendingUp } from 'lucide-react';
import { PlayerProfile, PlayerSession } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface PlayerProfilesListProps {
  serverId: string;
  isLoading?: boolean;
}

interface PlayerSessionHistoryProps {
  profileId: string;
  playerName: string;
  isOpen: boolean;
  onClose: () => void;
}

const PlayerSessionHistory = ({ profileId, playerName, isOpen, onClose }: PlayerSessionHistoryProps) => {
  const { data: sessions, isLoading } = useQuery<PlayerSession[]>({
    queryKey: ['/api/profiles', profileId, 'sessions'],
    enabled: isOpen && !!profileId,
  });

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return 'Unknown';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {playerName} - Session History
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sessions?.map((session) => (
                <Card key={session.id} className="bg-gray-100 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-300">
                            {formatDate(session.joinTime)}
                          </span>
                          {session.isActive && (
                            <Badge variant="default" className="bg-green-600 text-white">
                              Online Now
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Duration: {formatDuration(session.durationMinutes)}</span>
                          </div>
                          
                          {session.leaveTime && (
                            <span>Left: {formatDate(session.leaveTime)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        {session.playerRank && (
                          <div className="text-sm text-slate-400">
                            Rank: #{session.playerRank}
                          </div>
                        )}
                        {session.playerScore && (
                          <div className="text-sm text-slate-400">
                            Score: {session.playerScore}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {sessions?.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No session history found for this player.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function PlayerProfilesList({ serverId, isLoading: parentLoading }: PlayerProfilesListProps) {
  const [selectedProfile, setSelectedProfile] = useState<{ id: string; name: string } | null>(null);
  
  const { data: profiles, isLoading } = useQuery<PlayerProfile[]>({
    queryKey: ['/api/servers', serverId, 'profiles'],
    enabled: !!serverId,
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSessionInfo = (profile: PlayerProfile) => {
    if (profile.isOnline && profile.currentSessionStart) {
      const startTime = new Date(profile.currentSessionStart);
      const now = new Date();
      const durationMs = now.getTime() - startTime.getTime();
      const durationMins = Math.floor(durationMs / (1000 * 60));
      return `Online for ${formatDuration(durationMins)}`;
    }
    
    if (profile.lastJoinTime) {
      return `Last joined ${formatLastSeen(profile.lastJoinTime)}`;
    }
    
    return 'No recent activity';
  };

  if (parentLoading || isLoading) {
    return (
      <Card className="bg-gray-100 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Player Profiles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-100 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Player Profiles</span>
            </div>
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {profiles?.length || 0} tracked players
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="player-profiles-list">
            {profiles?.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                onClick={() => setSelectedProfile({ id: profile.id, name: profile.playerName })}
                data-testid={`player-profile-${profile.playerName}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white truncate">
                      {profile.playerName}
                    </span>
                    {profile.isOnline && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" data-testid="online-indicator" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>{getSessionInfo(profile)}</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{profile.totalSessions} sessions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(profile.totalPlayTimeMinutes)} total</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary-foreground hover:bg-primary"
                  data-testid={`view-profile-${profile.playerName}`}
                >
                  View Profile
                </Button>
              </div>
            ))}
            
            {profiles?.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No player profiles found. Players will appear here once they join the server.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedProfile && (
        <PlayerSessionHistory
          profileId={selectedProfile.id}
          playerName={selectedProfile.name}
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </>
  );
}