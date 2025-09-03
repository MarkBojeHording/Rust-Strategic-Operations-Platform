import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Server } from '@shared/schema';
import { ExternalLink, Image, Download, X, Wifi, WifiOff, Clock, AlertTriangle, Users, Activity } from 'lucide-react';
import { useState } from 'react';

interface ServerOverviewProps {
  server: Server;
  autoRefresh: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
  premiumPlayerCount?: number;
}

export function ServerOverview({ server, autoRefresh, onAutoRefreshChange, premiumPlayerCount = 0 }: ServerOverviewProps) {
  const [showMapImage, setShowMapImage] = useState(false);
  const [mapImageLoading, setMapImageLoading] = useState(false);
  const [mapImageError, setMapImageError] = useState<string | null>(null);
  const [highResMapUrl, setHighResMapUrl] = useState<string | null>(null);
  const [fetchingHighRes, setFetchingHighRes] = useState(false);

  const handleViewOnBattleMetrics = () => {
    window.open(`https://battlemetrics.com/servers/rust/${server.id}`, '_blank');
  };

  const handleShowMapImage = async () => {
    if (!server.mapInfo?.imageUrl && !server.mapInfo?.thumbnailUrl) {
      setMapImageError("No map image available for this server");
      return;
    }

    setMapImageLoading(true);
    setMapImageError(null);
    setShowMapImage(true);
    setMapImageLoading(false);
  };

  const handleFetchHighResMap = async () => {
    if (!server.mapInfo?.url) {
      setMapImageError("No RustMaps URL available for this server");
      return;
    }

    setFetchingHighRes(true);
    setMapImageError(null);

    try {
      const response = await fetch(`/api/servers/${server.id}/map-image`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch high-resolution map: ${response.status}`);
      }

      // Create a blob URL for the high-resolution image
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setHighResMapUrl(imageUrl);
      
      // Show the modal with high-res image
      setShowMapImage(true);
    } catch (error) {
      console.error('Error fetching high-resolution map:', error);
      setMapImageError(error instanceof Error ? error.message : 'Failed to fetch high-resolution map');
    } finally {
      setFetchingHighRes(false);
    }
  };

  const formatLastSeen = (timestamp: string) => {
    const lastSeen = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}min ago`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const formatWipeTime = (timestamp: string) => {
    const wipeDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - wipeDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays === 0) {
      if (diffHours === 0) {
        return 'Today';
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return wipeDate.toLocaleDateString();
    }
  };

  return (
    <>
      {/* Server Info Card */}
      <div className="lg:col-span-2">
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl shadow-2xl h-full hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <h2 className="text-3xl font-bold text-white leading-tight" data-testid="text-server-name">
                    {server.name}
                  </h2>
                  {/* Server Status Indicator */}
                  {server.status === 'online' ? (
                    <span className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-bold border border-green-500/30 shadow-lg" data-testid="status-online">
                      <Activity size={16} className="animate-pulse" />
                      ONLINE
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-bold border border-red-500/30 shadow-lg" data-testid="status-offline">
                      <WifiOff size={16} />
                      OFFLINE
                    </span>
                  )}
                  {server.rank && (
                    <span className="bg-yellow-500/20 text-yellow-400 px-3 py-2 rounded-full text-sm font-bold border border-yellow-500/30 shadow-lg" data-testid="text-server-rank">
                      #{server.rank}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                  <span data-testid="text-server-region">{server.region}</span>
                  <span>•</span>
                  <span data-testid="text-server-game">{server.game}</span>
                  <span>•</span>
                  <div className={server.status === 'online' ? "text-white font-medium" : "text-red-400 font-medium"}>
                    <div className="flex items-center space-x-3">
                      <Users size={16} className="text-blue-400" />
                      <span data-testid="text-current-players" className="text-lg font-bold">
                        {server.players}
                      </span>
                      <span className="text-gray-400">/</span>
                      <span data-testid="text-max-players" className="text-lg">
                        {server.maxPlayers}
                      </span>
                      <span className="text-gray-400">players</span>
                      {/* Premium Players Indicator */}
                      {premiumPlayerCount > 0 && (
                        <span className="inline-flex items-center bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg" data-testid="premium-player-count" title="Anonymous premium players online">
                          +{premiumPlayerCount} premium
                        </span>
                      )}
                      {server.status !== 'online' && (
                        <span className="text-xs text-red-400">(Last Known)</span>
                      )}
                    </div>
                    {/* Player Count Progress Bar */}
                    <div className="mt-2">
                      <Progress 
                        value={(server.players / server.maxPlayers) * 100} 
                        className="h-2 bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{((server.players / server.maxPlayers) * 100).toFixed(1)}% full</span>
                        <span>{server.maxPlayers - server.players} slots available</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Offline Warning */}
                {server.status !== 'online' && (
                  <div className="flex items-center gap-2 text-orange-400 text-sm mb-3 bg-orange-900/10 p-2 rounded border border-orange-800/30">
                    <AlertTriangle size={16} />
                    <span>Server is offline. Player data and map information may be outdated.</span>
                  </div>
                )}
                
                {/* Connection & Queue Information */}
                <div className="bg-gray-800/30 rounded-lg p-3 text-sm space-y-2 mb-3">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Connection</span>
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-gray-500" />
                      <span className="text-gray-500 text-xs">
                        Ping: {server.ping ? `${server.ping}ms` : '--'}
                      </span>
                    </div>
                  </div>
                  {server.status === 'online' ? (
                    <div className="text-green-400 text-xs">
                      ✓ Server responding • Real-time events active
                    </div>
                  ) : (
                    <div className="text-red-400 text-xs">
                      ✗ Server offline • Last seen: {server.lastSeen ? 
                        formatLastSeen(server.lastSeen) : 'Unknown'}
                    </div>
                  )}

                  {/* Queue Status */}
                  <div className="border-t border-gray-700 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400">Queue Status</span>
                      {server.players >= server.maxPlayers ? (
                        <span className="text-orange-400 text-xs">Server Full</span>
                      ) : (
                        <span className="text-green-400 text-xs">Open Slots</span>
                      )}
                    </div>
                    {server.players >= server.maxPlayers ? (
                      <div className="text-orange-400 text-xs">
                        Queue: {server.queueCount || 0} players waiting
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs">
                        {server.maxPlayers - server.players} slots available
                      </div>
                    )}
                  </div>

                  {/* Error States */}
                  {(server.status !== 'online' || server.errorMessage) && (
                    <div className="border-t border-gray-700 pt-2">
                      <div className="flex items-center gap-2 text-red-400 text-xs">
                        <AlertTriangle size={12} />
                        <span>
                          {server.errorMessage || 'Connection timeout - server not responding'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {(server.mapInfo || server.gameMode || server.lastWipe) && (
                  <div className="space-y-2">
                    {/* Game Mode and Wipe Info */}
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      {server.gameMode && (
                        <span data-testid="text-server-gamemode" className="text-purple-400">{server.gameMode}</span>
                      )}
                      {server.lastWipe && (
                        <>
                          {server.gameMode && <span>•</span>}
                          <span data-testid="text-server-wipe" className="text-orange-400">
                            Wipe: {formatWipeTime(server.lastWipe)}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Detailed Map Information */}
                    {server.mapInfo && (
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-blue-400 mb-2">Map Information</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {server.mapInfo.seed && (
                            <div>
                              <span className="text-gray-400">Seed:</span>
                              <span className="ml-2 text-white font-mono" data-testid="text-map-seed">{server.mapInfo.seed}</span>
                            </div>
                          )}
                          {server.mapInfo.size && (
                            <div>
                              <span className="text-gray-400">Size:</span>
                              <span className="ml-2 text-white" data-testid="text-map-size">{server.mapInfo.size}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-400">Map:</span>
                            <span className="ml-2 text-white" data-testid="text-map-name">{server.mapInfo.name}</span>
                          </div>
                          {server.mapInfo.entityCount && (
                            <div>
                              <span className="text-gray-400">Entity Count:</span>
                              <span className="ml-2 text-white" data-testid="text-map-entities">{server.mapInfo.entityCount.toLocaleString()}</span>
                            </div>
                          )}
                          {server.mapInfo.monuments && (
                            <div>
                              <span className="text-gray-400">Monuments:</span>
                              <span className="ml-2 text-white" data-testid="text-map-monuments">{server.mapInfo.monuments}</span>
                            </div>
                          )}
                        </div>
                        {server.mapInfo.url && (
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <a 
                              href={server.mapInfo.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm underline"
                              data-testid="link-rustmaps"
                            >
                              View on RustMaps →
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${server.status === 'online' ? 'text-green-500' : 'text-red-500'}`} data-testid="text-server-status">
                  {server.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="lg:col-span-2">
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl shadow-2xl h-full hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Server Actions
            </h3>
            <div className="space-y-4">
              <Button 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold shadow-lg transition-all duration-200 hover:shadow-xl"
                onClick={handleViewOnBattleMetrics}
                data-testid="button-view-battlemetrics"
              >
                <ExternalLink className="mr-3" size={18} />
                View on BattleMetrics
              </Button>
              


              {server.mapInfo && (server.mapInfo.imageUrl || server.mapInfo.thumbnailUrl) && (
                <Button 
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-bold shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
                  onClick={handleShowMapImage}
                  disabled={mapImageLoading}
                  data-testid="button-show-map"
                >
                  {mapImageLoading ? (
                    <Download className="mr-3 animate-spin" size={18} />
                  ) : (
                    <Image className="mr-3" size={18} />
                  )}
                  {mapImageLoading ? "Loading..." : "View Map Image"}
                </Button>
              )}
              {server.mapInfo?.url && (
                <Button 
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
                  onClick={handleFetchHighResMap}
                  disabled={fetchingHighRes}
                  data-testid="button-fetch-highres-map"
                >
                  {fetchingHighRes ? (
                    <Download className="mr-3 animate-spin" size={18} />
                  ) : (
                    <Download className="mr-3" size={18} />
                  )}
                  {fetchingHighRes ? "Fetching..." : "Fetch High-Res Map"}
                </Button>
              )}
            </div>

            {/* Auto Refresh Setting */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto Refresh</span>
                <Switch 
                  checked={autoRefresh}
                  onCheckedChange={onAutoRefreshChange}
                  data-testid="switch-auto-refresh"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Players: 30s • Stats: 5min
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Image Modal */}
      {showMapImage && server.mapInfo && (server.mapInfo.imageUrl || server.mapInfo.thumbnailUrl) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowMapImage(false)}>
          <div className="relative max-w-4xl max-h-[90vh] m-4" onClick={(e) => e.stopPropagation()}>
            <Button
              className="absolute -top-10 right-0 bg-red-600 hover:bg-red-700 text-white rounded-full p-2"
              onClick={() => setShowMapImage(false)}
              data-testid="button-close-map"
            >
              <X size={20} />
            </Button>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{server.mapInfo?.name} Map</h3>
                  <p className="text-sm text-gray-400">
                    Seed: {server.mapInfo?.seed} • Size: {server.mapInfo?.size}
                  </p>
                </div>
                {server.mapInfo.url && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => window.open(server.mapInfo?.url, '_blank')}
                    data-testid="button-open-rustmaps"
                  >
                    <ExternalLink className="mr-2" size={16} />
                    Open in RustMaps
                  </Button>
                )}
              </div>
              {mapImageError ? (
                <div className="text-red-400 text-center py-8">
                  Error: {mapImageError}
                </div>
              ) : (highResMapUrl || server.mapInfo.imageUrl || server.mapInfo.thumbnailUrl) ? (
                <div className="space-y-3">
                  <img
                    src={highResMapUrl || server.mapInfo.imageUrl || server.mapInfo.thumbnailUrl}
                    alt={`${server.mapInfo?.name || 'Map'} Map`}
                    className="max-w-full h-auto rounded border border-gray-700"
                    data-testid="img-map"
                  />
                  {highResMapUrl ? (
                    <div className="text-center bg-green-900/20 rounded-lg p-3">
                      <p className="text-sm text-green-300">
                        ✅ High-resolution map fetched successfully!
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        This is the detailed map image scraped from RustMaps with full resolution.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center bg-blue-900/20 rounded-lg p-3">
                      <p className="text-sm text-blue-300">
                        💡 Use "Fetch High-Res Map" to get the detailed image from RustMaps
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Our system will scrape the high-resolution map directly from the RustMaps website.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  Map image not available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
