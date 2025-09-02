
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Trash2, UserPlus, Users, Plus, Edit, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'member';
  isActive: boolean;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  memberCount?: number;
}

interface TeamMember {
  userId: string;
  teamId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user?: User;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ [teamId: string]: TeamMember[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User form state
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    role: 'member' as 'admin' | 'member'
  });
  const [editingUser, setEditingUser] = useState<string | null>(null);

  // Team form state
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: ''
  });
  const [editingTeam, setEditingTeam] = useState<string | null>(null);

  // Member management state
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [addMemberForm, setAddMemberForm] = useState({
    userId: '',
    role: 'member' as 'owner' | 'admin' | 'member'
  });

  // Fetch data
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/admin/teams', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to fetch teams');
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(prev => ({ ...prev, [teamId]: data }));
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchTeams();
    }
  }, [isOpen]);

  // User management functions
  const handleCreateUser = async () => {
    if (!userForm.username || !userForm.email) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userForm)
      });

      if (response.ok) {
        await fetchUsers();
        setUserForm({ username: '', email: '', role: 'member' });
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create user');
      }
    } catch (error) {
      setError('Failed to create user');
    }
    setLoading(false);
  };

  const handleUpdateUser = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userForm)
      });

      if (response.ok) {
        await fetchUsers();
        setEditingUser(null);
        setUserForm({ username: '', email: '', role: 'member' });
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update user');
      }
    } catch (error) {
      setError('Failed to update user');
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchUsers();
        setError(null);
      } else {
        setError('Failed to delete user');
      }
    } catch (error) {
      setError('Failed to delete user');
    }
    setLoading(false);
  };

  // Team management functions
  const handleCreateTeam = async () => {
    if (!teamForm.name) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(teamForm)
      });

      if (response.ok) {
        await fetchTeams();
        setTeamForm({ name: '', description: '' });
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create team');
      }
    } catch (error) {
      setError('Failed to create team');
    }
    setLoading(false);
  };

  const handleUpdateTeam = async (teamId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(teamForm)
      });

      if (response.ok) {
        await fetchTeams();
        setEditingTeam(null);
        setTeamForm({ name: '', description: '' });
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update team');
      }
    } catch (error) {
      setError('Failed to update team');
    }
    setLoading(false);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchTeams();
        setError(null);
      } else {
        setError('Failed to delete team');
      }
    } catch (error) {
      setError('Failed to delete team');
    }
    setLoading(false);
  };

  // Team member management
  const handleAddTeamMember = async () => {
    if (!selectedTeam || !addMemberForm.userId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/teams/${selectedTeam}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(addMemberForm)
      });

      if (response.ok) {
        await fetchTeamMembers(selectedTeam);
        setAddMemberForm({ userId: '', role: 'member' });
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add team member');
      }
    } catch (error) {
      setError('Failed to add team member');
    }
    setLoading(false);
  };

  const handleRemoveTeamMember = async (teamId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchTeamMembers(teamId);
        setError(null);
      } else {
        setError('Failed to remove team member');
      }
    } catch (error) {
      setError('Failed to remove team member');
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Admin Dashboard
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="teams">Team Management</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
                <CardDescription>Add a new user to the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={userForm.username}
                      onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={userForm.role} onValueChange={(value: 'admin' | 'member') => setUserForm(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={editingUser ? () => handleUpdateUser(editingUser) : handleCreateUser}
                  disabled={loading}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
                {editingUser && (
                  <Button variant="outline" onClick={() => {
                    setEditingUser(null);
                    setUserForm({ username: '', email: '', role: 'member' });
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel Edit
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(user.id);
                            setUserForm({
                              username: user.username,
                              email: user.email,
                              role: user.role
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Team</CardTitle>
                <CardDescription>Add a new team to the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter team name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teamDescription">Description</Label>
                    <Input
                      id="teamDescription"
                      value={teamForm.description}
                      onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description (optional)"
                    />
                  </div>
                </div>
                <Button 
                  onClick={editingTeam ? () => handleUpdateTeam(editingTeam) : handleCreateTeam}
                  disabled={loading}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </Button>
                {editingTeam && (
                  <Button variant="outline" onClick={() => {
                    setEditingTeam(null);
                    setTeamForm({ name: '', description: '' });
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel Edit
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teams ({teams.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div key={team.id} className="border rounded p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{team.name}</div>
                            {team.description && (
                              <div className="text-sm text-gray-500">{team.description}</div>
                            )}
                          </div>
                          <Badge variant={team.isActive ? 'default' : 'destructive'}>
                            {team.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTeam(team.id);
                              fetchTeamMembers(team.id);
                            }}
                          >
                            Manage Members
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTeam(team.id);
                              setTeamForm({
                                name: team.name,
                                description: team.description || ''
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTeam(team.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {selectedTeam === team.id && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex gap-4 mb-4">
                            <Select value={addMemberForm.userId} onValueChange={(value) => setAddMemberForm(prev => ({ ...prev, userId: value }))}>
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.filter(u => !teamMembers[team.id]?.some(m => m.userId === u.id)).map(user => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={addMemberForm.role} onValueChange={(value: 'owner' | 'admin' | 'member') => setAddMemberForm(prev => ({ ...prev, role: value }))}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={handleAddTeamMember} disabled={loading}>
                              Add Member
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {teamMembers[team.id]?.map((member) => (
                              <div key={`${member.teamId}-${member.userId}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <span>{users.find(u => u.id === member.userId)?.username || member.userId}</span>
                                  <Badge variant="outline">{member.role}</Badge>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRemoveTeamMember(team.id, member.userId)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AdminModal;
