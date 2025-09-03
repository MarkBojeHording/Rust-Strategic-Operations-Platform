import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Server } from '@shared/schema';
import { Plus, ExternalLink, Wifi, WifiOff, Clock, AlertTriangle, Map, Eye, EyeOff, X, Trash2, MapPin, AlertCircle, XCircle, Users, UserPlus, Settings } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ServerPreview extends Server {
  mapFetched: boolean;
  lastChecked: string;
}

interface ErrorMessage {
  id: string;
  message: string;
  type: 'error' | 'warning';
  timestamp: Date;
  source: string;
}

interface User {
  id: string;
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: User;
}

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name too long"),
  description: z.string().optional(),
});

export default function ServersPage() {
  const [newServerUrl, setNewServerUrl] = useState('');
  const [addingServer, setAddingServer] = useState(false);
  const [errorMessages, setErrorMessages] = useState<ErrorMessage[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addErrorMessage = useCallback((message: string, source: string, type: 'error' | 'warning' = 'error') => {
    const newError: ErrorMessage = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date(),
      source
    };
    setErrorMessages(prev => [newError, ...prev].slice(0, 50)); // Keep only last 50 errors
  }, []);

  const clearErrorMessages = () => {
    setErrorMessages([]);
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const formatErrorTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  // Fetch users
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  // Handle users error with useEffect to prevent infinite renders
  useEffect(() => {
    if (usersError && !usersLoading) {
      const errorMsg = usersError instanceof Error ? usersError.message : 'Failed to fetch users';
      addErrorMessage(errorMsg, 'Users Query');
    }
  }, [usersError, usersLoading]);

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = useQuery({
    queryKey: ['/api/admin/teams'],
    queryFn: async () => {
      const res = await fetch('/api/admin/teams');
      if (!res.ok) throw new Error('Failed to fetch teams');
      return res.json();
    },
  });

  // Handle teams error with useEffect to prevent infinite renders
  useEffect(() => {
    if (teamsError && !teamsLoading) {
      const errorMsg = teamsError instanceof Error ? teamsError.message : 'Failed to fetch teams';
      addErrorMessage(errorMsg, 'Teams Query');
    }
  }, [teamsError, teamsLoading]);

  // User form
  const userForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Team form
  const teamForm = useForm<z.infer<typeof createTeamSchema>>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof createUserSchema>) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      userForm.reset();
      setShowCreateUser(false);
      toast({ title: 'User created successfully' });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create user';
      addErrorMessage(errorMsg, 'Create User');
      toast({ 
        title: 'Failed to create user', 
        description: errorMsg,
        variant: 'destructive'
      });
    }
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: z.infer<typeof createTeamSchema>) => {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to create team');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
      teamForm.reset();
      setShowCreateTeam(false);
      toast({ title: 'Team created successfully' });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create team';
      addErrorMessage(errorMsg, 'Create Team');
      toast({ 
        title: 'Failed to create team', 
        description: errorMsg,
        variant: 'destructive'
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User deleted successfully' });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete user';
      addErrorMessage(errorMsg, 'Delete User');
      toast({ 
        title: 'Failed to delete user', 
        description: errorMsg,
        variant: 'destructive'
      });
    }
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to delete team');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
      toast({ title: 'Team deleted successfully' });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete team';
      addErrorMessage(errorMsg, 'Delete Team');
      toast({ 
        title: 'Failed to delete team', 
        description: errorMsg,
        variant: 'destructive'
      });
    }
  });

  // Fetch list of connected servers
  const { data: servers = [], isLoading, error: serversError } = useQuery({
    queryKey: ['/api/servers'],
    queryFn: async () => {
      try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/servers?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!res.ok) {
          throw new Error(`Server fetch failed: ${res.status}`);
        }
        const data = await res.json();
        console.log('Servers data fetched at', new Date().toISOString(), ':', data.map((s: any) => ({ id: s.id, name: s.name, mapFetched: s.mapFetched })));
        return data;
      } catch (error) {
        console.error('Servers query error:', error);
        throw error;
      }
    },
    staleTime: 0, // Always refetch to get latest mapFetched status
    gcTime: 0, // Don't cache results
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      console.log(`Servers query retry attempt ${failureCount}:`, error);
      return failureCount < 2; // Only retry twice
    },
  }) as { data: ServerPreview[], isLoading: boolean, error: Error | null };

  // Handle servers error
  if (serversError && !isLoading) {
    const errorMsg = serversError instanceof Error ? serversError.message : 'Failed to fetch servers';
    addErrorMessage(errorMsg, 'Server Query');
  }

  // Fetch database metrics
  const { data: dbMetrics, isLoading: dbMetricsLoading, error: dbMetricsError } = useQuery({
    queryKey: ['/api/database/metrics'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/database/metrics');
        if (!res.ok) {
          throw new Error(`Database metrics fetch failed: ${res.status}`);
        }
        const data = await res.json();
        console.log('Database metrics:', data);
        return data;
      } catch (error) {
        console.error('Database metrics query error:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error) => {
      console.log(`Database metrics query retry attempt ${failureCount}:`, error);
      return failureCount < 2; // Only retry twice
    },
  });

  // Handle database metrics error
  if (dbMetricsError && !dbMetricsLoading) {
    const errorMsg = dbMetricsError instanceof Error ? dbMetricsError.message : 'Failed to fetch database metrics';
    addErrorMessage(errorMsg, 'Database Metrics');
  }

  // Add server mutation
  const addServerMutation = useMutation({
    mutationFn: async (url: string) => {
      const serverId = extractServerIdFromUrl(url);
      if (!serverId) {
        throw new Error('Invalid BattleMetrics URL format');
      }
      return fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, serverId })
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      setNewServerUrl('');
      setAddingServer(false);
      toast({ title: 'Server added successfully' });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addErrorMessage(errorMsg, 'Add Server');
      toast({ 
        title: 'Failed to add server', 
        description: errorMsg,
        variant: 'destructive'
      });
    }
  });

  // Remove server mutation
  const removeServerMutation = useMutation({
    mutationFn: async (serverId: string) => {
      try {
        const response = await fetch(`/api/servers/${serverId}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to remove server: ${response.status} ${errorText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Remove server error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      toast({ title: 'Server removed successfully' });
    },
    onError: (error) => {
      console.error('Remove server mutation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addErrorMessage(errorMsg, 'Remove Server');
      toast({ 
        title: 'Failed to remove server', 
        description: errorMsg,
        variant: 'destructive'
      });
    }
  });

  // Fetch map mutation
  const fetchMapMutation = useMutation({
    mutationFn: async (serverId: string) => {
      try {
        const response = await fetch(`/api/servers/${serverId}/map-image`);
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch map: ${response.status} ${errorText}`);
        }
        return response.blob();
      } catch (error) {
        console.error('Map fetch error:', error);
        throw error;
      }
    },
    onSuccess: async (_, serverId) => {
      console.log('Map fetched and cache invalidated for server:', serverId);
      
      // Force immediate cache invalidation and refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      await queryClient.refetchQueries({ queryKey: ['/api/servers'] });
      
      toast({ title: 'Map fetched successfully' });
    },
    onError: (error) => {
      console.error('Map fetch mutation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addErrorMessage(errorMsg, 'Map Fetch');
      toast({ 
        title: 'Map fetch failed', 
        description: errorMsg,
        variant: 'destructive'
      });
    }
  });

  // Delete all data mutation (for prototyping)
  const deleteAllDataMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await fetch('/api/admin/delete-all-data', { 
          method: 'DELETE'
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to delete data: ${response.status} ${errorText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Delete all data error:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      // Force immediate cache invalidation and refetch for all queries
      await queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/database/metrics'] });
      await queryClient.refetchQueries({ queryKey: ['/api/servers'] });
      await queryClient.refetchQueries({ queryKey: ['/api/database/metrics'] });
      
      toast({ 
        title: 'All data deleted successfully',
        description: 'Servers, profiles, sessions, activities, and maps cleared'
      });
    },
    onError: (error) => {
      console.error('Delete all data mutation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addErrorMessage(errorMsg, 'Delete Data');
      toast({ 
        title: 'Failed to delete data', 
        description: errorMsg,
        variant: 'destructive'
      });
    }
  });

  const extractServerIdFromUrl = (url: string): string | null => {
    const match = url.match(/battlemetrics\.com\/servers\/[^\/]+\/(\d+)/);
    return match ? match[1] : null;
  };

  const handleAddServer = () => {
    if (!newServerUrl.trim()) return;
    addServerMutation.mutate(newServerUrl.trim());
  };

  const formatLastSeen = (timestamp: string) => {
    const lastSeen = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-400">Loading servers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen grid grid-cols-2">
      {/* Left Half - Server Management */}
      <div className="p-6 space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Server Management</h1>
            <p className="text-gray-400 mt-2">Add and monitor your BattleMetrics servers</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => deleteAllDataMutation.mutate()}
              disabled={deleteAllDataMutation.isPending}
              variant="destructive"
              size="sm"
              data-testid="button-delete-all-data"
            >
              <Trash2 size={16} className="mr-2" />
              {deleteAllDataMutation.isPending ? 'Deleting...' : 'Delete All Data'}
            </Button>
            <Badge variant="outline" className="text-gray-400">
              {servers.length} {servers.length === 1 ? 'Server' : 'Servers'}
            </Badge>
          </div>
        </div>

        {/* Database Metrics Section */}
        <Card className="bg-surface border-gray-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Database Usage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-300">Database Usage</span>
                </div>
                {dbMetricsLoading ? (
                  <div className="text-gray-400 text-sm">Loading...</div>
                ) : dbMetrics ? (
                  <>
                    <div className="text-lg font-semibold text-white">
                      {dbMetrics.database.size} / {dbMetrics.database.limit}
                    </div>
                    <div className="text-xs text-gray-400">
                      {dbMetrics.database.usagePercentage}% used
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(dbMetrics.database.usagePercentage, 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-red-400 text-sm">Error loading</div>
                )}
              </div>

              {/* Average Data Per Hour */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-300">Data Per Hour</span>
                </div>
                {dbMetricsLoading ? (
                  <div className="text-gray-400 text-sm">Loading...</div>
                ) : dbMetrics ? (
                  <>
                    <div className="text-lg font-semibold text-white">
                      {dbMetrics.usage.avgDataPerHourFormatted}
                    </div>
                    <div className="text-xs text-gray-400">
                      {dbMetrics.usage.avgActivitiesPerHour} activities/hr avg
                    </div>
                  </>
                ) : (
                  <div className="text-red-400 text-sm">Error loading</div>
                )}
              </div>

              {/* Storage Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-300">Storage Breakdown</span>
                </div>
                {dbMetricsLoading ? (
                  <div className="text-gray-400 text-sm">Loading...</div>
                ) : dbMetrics ? (
                  <>
                    <div className="text-sm text-gray-300">
                      Maps: {dbMetrics.tables.maps.size} ({dbMetrics.tables.maps.count})
                    </div>
                    <div className="text-sm text-gray-300">
                      Activities: {dbMetrics.tables.activities.size} ({dbMetrics.tables.activities.count})
                    </div>
                  </>
                ) : (
                  <div className="text-red-400 text-sm">Error loading</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Server Section */}
        <Card className="bg-surface border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Add New Server</h2>
            <div className="flex gap-3">
              <Input
                placeholder="https://www.battlemetrics.com/servers/rust/2933470"
                value={newServerUrl}
                onChange={(e) => setNewServerUrl(e.target.value)}
                className="flex-1 bg-gray-800 border-gray-600 text-white"
                data-testid="input-server-url"
              />
              <Button 
                onClick={handleAddServer}
                disabled={!newServerUrl.trim() || addServerMutation.isPending}
                className="bg-primary hover:bg-blue-600"
                data-testid="button-add-server"
              >
                <Plus size={16} className="mr-2" />
                {addServerMutation.isPending ? 'Adding...' : 'Add Server'}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Enter the full BattleMetrics URL for any game server
            </p>
          </CardContent>
        </Card>

        {/* Server Grid */}
        {servers.length === 0 ? (
          <Card className="bg-surface border-gray-700">
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">No servers added yet</div>
              <p className="text-sm text-gray-500">
                Add your first server using a BattleMetrics URL above
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {servers.map((server) => (
              <Card key={server.id} className="bg-surface border-gray-700 hover:border-gray-600 transition-colors">
                <CardContent className="p-4">
                  {/* Compact Layout */}
                  <div className="flex items-center gap-4">
                    {/* Server Info - Left Side */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-white truncate" data-testid={`text-server-name-${server.id}`}>
                            {server.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <span>{server.game}</span>
                            <span>•</span>
                            <span>{server.region}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeServerMutation.mutate(server.id)}
                          className="text-gray-400 hover:text-red-400 p-1 ml-2"
                          data-testid={`button-remove-${server.id}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      {/* Error State */}
                      {server.errorMessage && (
                        <div className="bg-red-900/20 border border-red-800/30 rounded p-1 mb-2">
                          <div className="flex items-center gap-1 text-red-400 text-xs">
                            <AlertTriangle size={10} />
                            <span className="truncate">{server.errorMessage}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Grid - Center */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs min-w-[140px]">
                      {/* Status */}
                      <span className="text-gray-400">Status:</span>
                      {server.status === 'online' ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <Wifi size={10} />
                          Online
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-400">
                          <WifiOff size={10} />
                          Offline
                        </div>
                      )}

                      {/* Players */}
                      <span className="text-gray-400">Players:</span>
                      <span className={`font-medium ${
                        server.status === 'online' ? 'text-white' : 'text-red-400'
                      }`}>
                        {server.players}/{server.maxPlayers}
                      </span>

                      {/* Ping */}
                      <span className="text-gray-400">Ping:</span>
                      <span className="text-white">
                        {server.ping ? `${server.ping}ms` : '--'}
                      </span>

                      {/* Last Checked */}
                      <span className="text-gray-400">Updated:</span>
                      <span className="text-gray-500">
                        {server.lastChecked ? formatLastSeen(server.lastChecked) : 'Never'}
                      </span>
                    </div>

                    {/* Map Status & Actions - Right Side */}
                    <div className="flex flex-col gap-2 items-end min-w-[100px]">
                      {/* Map Status */}
                      <div className="flex items-center gap-2">
                        <Map size={12} className={server.mapFetched ? "text-green-400" : "text-gray-400"} />
                        {server.mapFetched ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs px-1.5 py-0.5">
                              ✓ Hi-Res
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/api/servers/${server.id}/map`, '_blank')}
                              className="text-xs px-2 py-1 h-6 text-green-400 border-green-400/30 hover:bg-green-400/10"
                              data-testid={`button-view-map-${server.id}`}
                            >
                              View
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchMapMutation.mutate(server.id)}
                            disabled={fetchMapMutation.isPending}
                            className="text-xs px-2 py-1 h-6"
                            data-testid={`button-fetch-map-${server.id}`}
                          >
                            {fetchMapMutation.isPending ? 'Fetching...' : 'Fetch Map'}
                          </Button>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-1">
                        <Link href={`/dashboard?server=${server.id}`}>
                          <Button 
                            size="sm"
                            className="bg-primary hover:bg-blue-600 text-xs px-3 py-1 h-6"
                            data-testid={`button-details-${server.id}`}
                          >
                            <Eye size={12} className="mr-1" />
                            Details
                          </Button>
                        </Link>
                        <Link href="/map-viewer">
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-6"
                            data-testid={`button-maps-${server.id}`}
                          >
                            <MapPin size={12} className="mr-1" />
                            Maps
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://www.battlemetrics.com/servers/${server.game.toLowerCase()}/${server.id}`, '_blank')}
                          className="px-2 py-1 h-6"
                          data-testid={`button-battlemetrics-${server.id}`}
                        >
                          <ExternalLink size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Right Half - Split into Top and Bottom */}
      <div className="grid grid-rows-2">
        {/* Top Right - Team Admin Section */}
        <div className="bg-gray-900 border-l border-gray-700">
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Team Admin</h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowCreateUser(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-user"
                >
                  <UserPlus size={14} className="mr-1" />
                  User
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCreateTeam(true)}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-create-team"
                >
                  <Users size={14} className="mr-1" />
                  Team
                </Button>
              </div>
            </div>

            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
                <TabsTrigger value="teams">Teams ({teams.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-2 mt-4">
                {/* Create User Form */}
                {showCreateUser && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <Form {...userForm}>
                        <form onSubmit={userForm.handleSubmit(data => createUserMutation.mutate(data))} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-white">Create User</h3>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowCreateUser(false)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                          
                          <FormField
                            control={userForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">Username</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter username" 
                                    className="bg-gray-700 border-gray-600 text-white"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={userForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">Password</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password"
                                    placeholder="Enter password" 
                                    className="bg-gray-700 border-gray-600 text-white"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            disabled={createUserMutation.isPending}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                )}

                {/* Users List */}
                <div className="space-y-1">
                  {usersLoading ? (
                    <div className="text-gray-400 text-sm">Loading users...</div>
                  ) : users.length === 0 ? (
                    <div className="text-gray-500 text-sm">No users found</div>
                  ) : (
                    users.map((user: User) => (
                      <div key={user.id} className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded border border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {user.username}
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              user.role === 'admin' 
                                ? 'text-red-400 border-red-400/30' 
                                : user.role === 'team_admin'
                                ? 'text-yellow-400 border-yellow-400/30'
                                : 'text-gray-400 border-gray-400/30'
                            }`}
                          >
                            {user.role}
                          </Badge>
                          <div className="flex items-center gap-1 bg-gray-700/50 px-2 py-1 rounded">
                            <div className="text-xs text-gray-300 font-mono">
                              {visiblePasswords.has(user.id) ? user.password : '••••••••'}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-gray-400 hover:text-gray-200 h-4 w-4 p-0"
                              data-testid={`button-toggle-password-${user.id}`}
                            >
                              {visiblePasswords.has(user.id) ? <EyeOff size={10} /> : <Eye size={10} />}
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          disabled={deleteUserMutation.isPending}
                          className="text-gray-400 hover:text-red-400 p-1"
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="teams" className="space-y-2 mt-4">
                {/* Create Team Form */}
                {showCreateTeam && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <Form {...teamForm}>
                        <form onSubmit={teamForm.handleSubmit(data => createTeamMutation.mutate(data))} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-white">Create Team</h3>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowCreateTeam(false)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                          
                          <FormField
                            control={teamForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">Team Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Development Team" 
                                    className="bg-gray-700 border-gray-600 text-white"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={teamForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">Description</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Team description (optional)" 
                                    className="bg-gray-700 border-gray-600 text-white"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            disabled={createTeamMutation.isPending}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                )}

                {/* Teams List */}
                <div className="space-y-2">
                  {teamsLoading ? (
                    <div className="text-gray-400 text-sm">Loading teams...</div>
                  ) : teams.length === 0 ? (
                    <div className="text-gray-500 text-sm">No teams found</div>
                  ) : (
                    teams.map((team: Team) => (
                      <Card key={team.id} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">
                                {team.name}
                              </div>
                              {team.description && (
                                <div className="text-xs text-gray-400 truncate">
                                  {team.description}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Created {new Date(team.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-blue-400 p-1"
                                data-testid={`button-manage-team-${team.id}`}
                              >
                                <Settings size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTeamMutation.mutate(team.id)}
                                disabled={deleteTeamMutation.isPending}
                                className="text-gray-400 hover:text-red-400 p-1"
                                data-testid={`button-delete-team-${team.id}`}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Bottom Right - Error Message Display */}
        <div className="bg-gray-950 border-l border-t border-gray-700">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Error Messages</h2>
              {errorMessages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearErrorMessages}
                  className="text-gray-400 hover:text-white"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {errorMessages.length === 0 ? (
                <div className="text-gray-500 text-sm">No error messages</div>
              ) : (
                <div className="space-y-2">
                  {errorMessages.map((error) => (
                    <div 
                      key={error.id}
                      className={`p-3 rounded border ${
                        error.type === 'error' 
                          ? 'bg-red-900/20 border-red-800/30' 
                          : 'bg-yellow-900/20 border-yellow-800/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {error.type === 'error' ? (
                          <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${
                            error.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {error.source}
                          </div>
                          <div className="text-sm text-gray-300 mt-1 break-words">
                            {error.message}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatErrorTime(error.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}