import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Player } from '@shared/schema';
import { Search } from 'lucide-react';

interface PlayersTableProps {
  players: Player[];
  isLoading: boolean;
}

export function PlayersTable({ players, isLoading }: PlayersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlayerInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-primary',
      'bg-orange-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-blue-500',
      'bg-red-500',
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <Card className="bg-surface border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Online Players</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Real-time</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Player Search */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input 
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-variant border-gray-600 pl-10 pr-4 text-white placeholder-gray-400"
            data-testid="input-search-players"
          />
        </div>
      </div>

      {/* Players Table */}
      <div className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-300">Loading players...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">
              {searchTerm ? 'No players found matching your search.' : 'No players currently online.'}
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-96">
            <table className="w-full">
              <thead className="bg-surface-variant sticky top-0">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-300 text-sm">Player</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-300 text-sm">Session Time</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-300 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr 
                    key={player.id} 
                    className="border-b border-gray-700 hover:bg-surface-variant transition-colors"
                    data-testid={`row-player-${player.id}`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 ${getAvatarColor(player.name)} rounded-full flex items-center justify-center text-sm font-semibold`}>
                          <span>{getPlayerInitial(player.name)}</span>
                        </div>
                        <div>
                          <div className="font-medium text-white" data-testid={`text-player-name-${player.id}`}>
                            {player.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: <span data-testid={`text-player-id-${player.id}`}>{player.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-300" data-testid={`text-session-time-${player.id}`}>
                      {player.sessionTime}
                    </td>
                    <td className="py-4 px-6">
                      <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/20">
                        Online
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
