import { 
  type DBServer, 
  type InsertDBServer, 
  type UpsertUser, 
  type User, 
  type DBTeam,
  type InsertDBTeam,
  type DBTeamMember,
  type InsertDBTeamMember,
  users,
  teams,
  teamMembers
} from "../shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db.js";
import { eq, and, desc } from "drizzle-orm";

// Storage interface for server management and authentication
export interface IStorage {
  // Server operations
  getServer(id: string): Promise<DBServer | undefined>;
  createServer(server: InsertDBServer): Promise<DBServer>;
  getAllServers(): Promise<DBServer[]>;
  
  // User operations (for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Team management operations
  getAllUsers(): Promise<User[]>;
  createUser(userData: Omit<UpsertUser, 'id'>): Promise<User>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Team operations
  getAllTeams(): Promise<DBTeam[]>;
  getTeam(id: string): Promise<DBTeam | undefined>;
  createTeam(teamData: Omit<InsertDBTeam, 'id'>): Promise<DBTeam>;
  updateTeam(id: string, teamData: Partial<InsertDBTeam>): Promise<DBTeam>;
  deleteTeam(id: string): Promise<void>;
  
  // Team membership operations
  getTeamMembers(teamId: string): Promise<(DBTeamMember & { user: User })[]>;
  addTeamMember(teamId: string, userId: string, role: string): Promise<DBTeamMember>;
  updateTeamMemberRole(teamId: string, userId: string, role: string): Promise<DBTeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
  getUserTeams(userId: string): Promise<(DBTeamMember & { team: DBTeam })[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations for authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Server operations (legacy - maintained for compatibility)
  async getServer(id: string): Promise<DBServer | undefined> {
    throw new Error("Use Drizzle ORM directly for server operations");
  }

  async createServer(server: InsertDBServer): Promise<DBServer> {
    throw new Error("Use Drizzle ORM directly for server operations");
  }

  async getAllServers(): Promise<DBServer[]> {
    throw new Error("Use Drizzle ORM directly for server operations");
  }

  // User management operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(desc(users.createdAt));
  }

  async createUser(userData: { username: string; password: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: userData.username,
        password: userData.password,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Team management operations
  async getAllTeams(): Promise<DBTeam[]> {
    return await db.select().from(teams).where(eq(teams.isActive, true)).orderBy(desc(teams.createdAt));
  }

  async getTeam(id: string): Promise<DBTeam | undefined> {
    const [team] = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.isActive, true)));
    return team;
  }

  async createTeam(teamData: Omit<InsertDBTeam, 'id'>): Promise<DBTeam> {
    const [team] = await db
      .insert(teams)
      .values({
        ...teamData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return team;
  }

  async updateTeam(id: string, teamData: Partial<InsertDBTeam>): Promise<DBTeam> {
    const [team] = await db
      .update(teams)
      .set({
        ...teamData,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning();
    return team;
  }

  async deleteTeam(id: string): Promise<void> {
    await db
      .update(teams)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(teams.id, id));
  }

  // Team membership operations
  async getTeamMembers(teamId: string): Promise<(DBTeamMember & { user: User })[]> {
    return await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        createdAt: teamMembers.createdAt,
        user: {
          id: users.id,
          username: users.username,
          password: users.password,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(and(eq(teamMembers.teamId, teamId), eq(users.isActive, true)));
  }

  async addTeamMember(teamId: string, userId: string, role: string): Promise<DBTeamMember> {
    const [member] = await db
      .insert(teamMembers)
      .values({
        teamId,
        userId,
        role,
        joinedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();
    return member;
  }

  async updateTeamMemberRole(teamId: string, userId: string, role: string): Promise<DBTeamMember> {
    const [member] = await db
      .update(teamMembers)
      .set({ role })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning();
    return member;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  async getUserTeams(userId: string): Promise<(DBTeamMember & { team: DBTeam })[]> {
    return await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        createdAt: teamMembers.createdAt,
        team: {
          id: teams.id,
          name: teams.name,
          description: teams.description,
          isActive: teams.isActive,
          createdBy: teams.createdBy,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
        }
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, userId), eq(teams.isActive, true)));
  }
}

export const storage = new DatabaseStorage();