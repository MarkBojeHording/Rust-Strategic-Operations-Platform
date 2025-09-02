import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Info, Zap, Map, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface Server {
  id: string;
  name: string;
  mapFetched: boolean;
  players: number;
  maxPlayers: number;
}

interface MapInfo {
  totalMaps: number;
  maps: Array<{
    id: string;
    mapName: string;
    seed: string;
    size: number;
    fetchedAt: string;
    lastUsed: string | null;
    hasImage: boolean;
  }>;
}

export default function MapViewer() {
  const [serverId, setServerId] = useState("2933470"); // Default to Rusty Moose
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: servers } = useQuery<Server[]>({
    queryKey: ["/api/servers"],
  });

  const { data: mapInfo } = useQuery<MapInfo>({
    queryKey: ["/api/servers", serverId, "map-info"],
    enabled: !!serverId,
    retry: false,
  });

  const loadMap = async () => {
    if (!serverId) return;

    setMapLoading(true);
    setImageError(null);
    setMapImageUrl(null);

    try {
      // First try to get cached map
      const cachedResponse = await fetch(`/api/servers/${serverId}/map`);
      
      if (cachedResponse.ok) {
        const blob = await cachedResponse.blob();
        const url = URL.createObjectURL(blob);
        setMapImageUrl(url);
        
        const seed = cachedResponse.headers.get('X-Map-Seed');
        const cachedAt = cachedResponse.headers.get('X-Map-Cached-At');
        
        toast({
          title: "Cached Map Loaded",
          description: `Map seed: ${seed || 'unknown'}, cached: ${cachedAt ? new Date(cachedAt).toLocaleString() : 'unknown'}`,
        });
      } else {
        // If no cached map, fetch new high-resolution map
        toast({
          title: "Fetching New Map",
          description: "This may take 30-60 seconds for high-resolution processing...",
        });

        const newMapResponse = await fetch(`/api/servers/${serverId}/map-image`);
        
        if (newMapResponse.ok) {
          const blob = await newMapResponse.blob();
          const url = URL.createObjectURL(blob);
          setMapImageUrl(url);
          
          toast({
            title: "New Map Generated",
            description: "High-resolution map with tiles successfully created!",
          });
        } else {
          const error = await newMapResponse.json();
          setImageError(error.error || 'Failed to load map');
          toast({
            title: "Map Load Failed",
            description: error.error || 'Failed to load map',
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to load map",
        variant: "destructive",
      });
    } finally {
      setMapLoading(false);
    }
  };

  const downloadMap = () => {
    if (!mapImageUrl) return;
    
    const link = document.createElement('a');
    link.href = mapImageUrl;
    link.download = `rust-map-server-${serverId}.png`;
    link.click();
  };

  // Auto-load map when server changes
  useEffect(() => {
    if (serverId) {
      loadMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const selectedServer = servers?.find(s => s.id === serverId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="button-back-to-servers">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Servers
                </Button>
              </Link>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-6 h-6 text-orange-500" />
                  High-Resolution Map Viewer
                </CardTitle>
                <p className="text-muted-foreground">
                  View detailed server maps with tile-based high-resolution processing
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="server-id">Server ID</Label>
                <Input
                  id="server-id"
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  placeholder="Enter server ID (e.g. 2933470)"
                  data-testid="input-server-id"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={loadMap} 
                  disabled={mapLoading || !serverId}
                  className="w-full"
                  data-testid="button-load-map"
                >
                  {mapLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Load Map
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={downloadMap}
                  disabled={!mapImageUrl}
                  variant="outline"
                  className="w-full"
                  data-testid="button-download-map"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Server Info */}
            {selectedServer && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selectedServer.name}</Badge>
                <Badge variant={selectedServer.mapFetched ? "default" : "destructive"}>
                  {selectedServer.mapFetched ? "Map Available" : "No Map"}
                </Badge>
                <Badge variant="outline">
                  {selectedServer.players}/{selectedServer.maxPlayers} players
                </Badge>
              </div>
            )}

            {/* Map Info */}
            {mapInfo && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4" />
                    <span className="font-medium">Map Storage Info</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Maps:</span>
                      <div className="font-medium">{mapInfo.totalMaps}</div>
                    </div>
                    {mapInfo.maps?.[0] && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Seed:</span>
                          <div className="font-medium">{mapInfo.maps[0].seed}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Size:</span>
                          <div className="font-medium">{mapInfo.maps[0].size}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fetched:</span>
                          <div className="font-medium">
                            {new Date(mapInfo.maps[0].fetchedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Map Display */}
        <Card>
          <CardHeader>
            <CardTitle>Map Image</CardTitle>
          </CardHeader>
          <CardContent>
            {mapLoading && (
              <div className="flex items-center justify-center p-12">
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-orange-500" />
                  <div>
                    <p className="font-medium">Processing High-Resolution Map</p>
                    <p className="text-sm text-muted-foreground">
                      Fetching tiles and combining into detailed map...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {imageError && (
              <div className="flex items-center justify-center p-12">
                <div className="text-center space-y-2">
                  <p className="text-destructive font-medium">Failed to load map</p>
                  <p className="text-sm text-muted-foreground">{imageError}</p>
                  <Button onClick={loadMap} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {mapImageUrl && !mapLoading && (
              <div className="space-y-4">
                <div className="text-center">
                  <Badge variant="default" className="mb-4">
                    High-Resolution Map with Grid Overlay
                  </Badge>
                </div>
                <div className="border-2 border-muted rounded-lg overflow-hidden">
                  <img
                    src={mapImageUrl}
                    alt="Server Map"
                    className="w-full h-auto max-h-[80vh] object-contain bg-black"
                    data-testid="img-server-map"
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Right-click to save image • Use download button for full quality
                </div>
              </div>
            )}

            {!mapImageUrl && !mapLoading && !imageError && (
              <div className="flex items-center justify-center p-12 text-muted-foreground">
                <div className="text-center space-y-2">
                  <Map className="w-12 h-12 mx-auto opacity-50" />
                  <p>Enter a server ID and click "Load Map" to view the high-resolution map</p>
                  <p className="text-xs">The new system creates detailed maps with tile processing</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Servers */}
        {servers && servers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servers.map((server) => (
                  <Button
                    key={server.id}
                    variant={server.id === serverId ? "default" : "outline"}
                    onClick={() => setServerId(server.id)}
                    className="justify-start p-4 h-auto"
                    data-testid={`button-server-${server.id}`}
                  >
                    <div className="text-left">
                      <div className="font-medium truncate">{server.name}</div>
                      <div className="text-xs opacity-70">
                        ID: {server.id} • {server.players}/{server.maxPlayers}
                        {server.mapFetched && " • Map Ready"}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}