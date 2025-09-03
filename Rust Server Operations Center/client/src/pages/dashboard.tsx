import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

import { Server, Player } from '@shared/schema';
import { ServerOverview } from '@/components/server-overview';
import { PlayerProfilesList } from '@/components/player-profiles-list';

import { Loader2, Server as ServerIcon, Plug, RefreshCw, ArrowLeft, LogOut } from 'lucide-react';

export default function Dashboard() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const serverIdFromUrl = urlParams.get('server') || '2933470'; // Default to the working server
  
  const [serverId, setServerId] = useState(serverIdFromUrl);
  const [activeServerId, setActiveServerId] = useState(serverIdFromUrl);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();


  // Server data query - refresh every 30 seconds for live player count
  const serverQuery = useQuery<Server>({
    queryKey: ['/api/servers', activeServerId],
    enabled: !!activeServerId,
    refetchInterval: autoRefresh ? 30000 : false,
    retry: (failureCount, error: any) => {
      console.log(`Server query retry attempt ${failureCount}:`, error);
      return failureCount < 2;
    }
  });

  // Players data query - refresh every 30 seconds for live player list
  const playersQuery = useQuery<Player[]>({
    queryKey: ['/api/servers', activeServerId, 'players'],
    enabled: !!activeServerId,
    refetchInterval: autoRefresh ? 30000 : false,
    retry: (failureCount, error: any) => {
      console.log(`Players query retry attempt ${failureCount}:`, error);
      return failureCount < 2;
    }
  });

  // Premium player count query
  const premiumPlayerQuery = useQuery<{ premiumCount: number }>({
    queryKey: ['/api/servers', activeServerId, 'premium-count'],
    queryFn: async () => {
      if (!serverQuery.data || !playersQuery.data) return { premiumCount: 0 };
      
      const response = await fetch(
        `/api/servers/${activeServerId}/premium-count?totalPlayers=${serverQuery.data.players}&visiblePlayers=${playersQuery.data.length}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch premium player count');
      }
      
      return response.json();
    },
    enabled: !!activeServerId && !!serverQuery.data && !!playersQuery.data,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const isLoading = serverQuery.isLoading || playersQuery.isLoading;
  const hasError = serverQuery.error || playersQuery.error;

  const handleConnect = () => {
    if (!serverId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid server ID",
        variant: "destructive",
      });
      return;
    }
    
    const newServerId = serverId.trim();
    setActiveServerId(newServerId);

  };

  const handleRefresh = () => {
    serverQuery.refetch();
    playersQuery.refetch();
    toast({
      title: "Success",
      description: "Data refreshed successfully",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  useEffect(() => {
    if (serverQuery.error) {
      console.error('Dashboard server query error:', serverQuery.error);
      toast({
        title: "Connection Error",
        description: serverQuery.error instanceof Error ? serverQuery.error.message : "Failed to connect to server",
        variant: "destructive",
      });
    }
  }, [serverQuery.error, toast]);

  useEffect(() => {
    if (playersQuery.error) {
      console.error('Dashboard players query error:', playersQuery.error);
    }
  }, [playersQuery.error]);

  // Remove WebSocket connection (backend handles tracking)

  const getConnectionStatus = () => {
    if (hasError) {
      return { status: 'error', text: 'API Connection Failed', dot: 'bg-red-500' };
    }
    if (isLoading) {
      return { status: 'loading', text: 'Connecting...', dot: 'bg-yellow-500 animate-pulse' };
    }
    
    return { 
      status: 'connected', 
      text: 'API Connected • Persistent Tracking Active', 
      dot: 'bg-green-500'
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/servers">
                <Button variant="secondary" size="sm" className="mr-4 bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Servers
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <ServerIcon className="text-primary text-2xl" size={32} />
                <h1 className="text-2xl font-bold text-white">Server Dashboard</h1>
              </div>
            </div>
            
            {/* Server ID Input and Actions */}
            <div className="flex items-center space-x-4">
              <Input
                type="text"
                placeholder="Enter Server ID"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-48 bg-surface-variant border-gray-600 text-white placeholder-gray-400"
                data-testid="input-server-id"
              />
              <Button 
                onClick={handleConnect}
                className="bg-primary hover:bg-blue-600 text-white"
                data-testid="button-connect"
              >
                <Plug className="mr-2" size={16} />
                Connect
              </Button>
              <Button 
                onClick={handleRefresh}
                variant="outline"
                className="bg-surface-variant hover:bg-gray-600 border-gray-600"
                title="Refresh Data"
                data-testid="button-refresh"
              >
                <RefreshCw size={16} />
              </Button>
              <Button 
                onClick={() => window.location.href = '/api/logout'}
                variant="outline"
                className="bg-red-600 hover:bg-red-700 border-red-600"
                title="Logout"
                data-testid="button-logout"
              >
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Connection Status */}
        <div className="mb-6">
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${connectionStatus.dot}`} />
                  <span className="text-sm font-medium" data-testid="text-connection-status">
                    {connectionStatus.text}
                  </span>
                </div>
                <div className="text-sm text-gray-400" data-testid="text-last-update">
                  Last update: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mb-8">
            <Card className="bg-surface border-gray-700">
              <CardContent className="p-8">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="animate-spin h-12 w-12 text-primary" />
                  <p className="text-gray-300">Loading server data...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <div className="mb-8">
            <Card className="bg-red-900/20 border-red-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="text-red-500 text-xl">⚠️</div>
                  <div>
                    <h3 className="font-semibold text-red-500">Connection Error</h3>
                    <p className="text-gray-300 mt-1" data-testid="text-error-message">
                      {hasError instanceof Error ? hasError.message : 'Failed to connect to BattleMetrics API. Please check the server ID and try again.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Server Overview */}
        {serverQuery.data && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <ServerOverview 
              server={serverQuery.data as Server}
              autoRefresh={autoRefresh}
              onAutoRefreshChange={setAutoRefresh}
              premiumPlayerCount={premiumPlayerQuery.data?.premiumCount || 0}
            />
          </div>
        )}

        {/* Player Profiles */}
        {serverQuery.data && !isLoading && (
          <PlayerProfilesList 
            serverId={activeServerId}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
