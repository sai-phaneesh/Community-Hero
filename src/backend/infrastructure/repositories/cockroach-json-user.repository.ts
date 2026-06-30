import { Pool } from "pg";
import { UserRepository } from "../../domain/repositories/user.repository";
import { User } from "../../../types";

export class CockroachJsonUserRepository implements UserRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private rowToUser(row: any): User {
    let history: any[] = [];
    try {
      history = typeof row.tenancy_history === "string" ? JSON.parse(row.tenancy_history) : (row.tenancy_history || []);
    } catch (_) {}

    let sessions: any[] = [];
    try {
      sessions = typeof row.active_sessions === "string" ? JSON.parse(row.active_sessions) : (row.active_sessions || []);
    } catch (_) {}

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      name: row.name,
      phone: row.phone,
      houseNumber: row.house_number || undefined,
      specialty: row.specialty || undefined,
      points: row.points || 0,
      badges: row.badges || [],
      avatarUrl: row.avatar_url || undefined,
      username: row.username || `user_${row.id}`,
      residenceType: row.residence_type || undefined,
      residenceStartDate: row.residence_start_date || undefined,
      tenancyHistory: history,
      lastLoggedIn: row.last_logged_in || undefined,
      activeSessions: sessions,
      capabilities: row.capabilities || [],
      latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : undefined,
      longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : undefined,
      password: row.password, // needed for auth
    } as any;
  }

  private localToUser(u: any): User {
    return {
      ...u,
      points: u.points || 0,
      badges: u.badges || [],
      username: u.username || `user_${u.id}`,
      tenancyHistory: u.tenancyHistory || [],
      activeSessions: u.activeSessions || [],
      capabilities: u.capabilities || [],
    };
  }

  async findById(id: string): Promise<User | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM users WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        return this.rowToUser(res.rows[0]);
      } catch (err) {
        console.error("[UserRepository Database Error] findById failed:", err);
        throw new Error("Database error while retrieving user account.");
      }
    }
    const local = this.readLocalDB();
    const u = local.users.find((user: any) => user.id === id);
    return u ? this.localToUser(u) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        if (res.rows.length === 0) return null;
        return this.rowToUser(res.rows[0]);
      } catch (err) {
        console.error("[UserRepository Database Error] findByEmail failed:", err);
        throw new Error("Database error while searching user account.");
      }
    }
    const local = this.readLocalDB();
    const u = local.users.find((user: any) => user.email.toLowerCase() === email.toLowerCase());
    return u ? this.localToUser(u) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM users WHERE LOWER(username) = LOWER($1)", [username]);
        if (res.rows.length === 0) return null;
        return this.rowToUser(res.rows[0]);
      } catch (err) {
        console.error("[UserRepository Database Error] findByUsername failed:", err);
        throw new Error("Database error while searching user handle.");
      }
    }
    const local = this.readLocalDB();
    const u = local.users.find((user: any) => (user.username || "").toLowerCase() === username.toLowerCase());
    return u ? this.localToUser(u) : null;
  }

  async findAll(): Promise<User[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM users");
        return res.rows.map((row) => this.rowToUser(row));
      } catch (err) {
        console.error("[UserRepository Database Error] findAll failed:", err);
        throw new Error("Database error while retrieving user list.");
      }
    }
    const local = this.readLocalDB();
    return local.users.map((u: any) => this.localToUser(u));
  }

  async create(user: User & { password?: string }): Promise<User> {
    const points = user.points || 0;
    const badges = user.badges || [];
    const history = user.tenancyHistory || [];
    const sessions = user.activeSessions || [];
    
    if (this.pool) {
      try {
        const lat = user.latitude !== undefined ? user.latitude : (12.970 + Math.random() * 0.005);
        const lng = user.longitude !== undefined ? user.longitude : (77.590 + Math.random() * 0.005);
        await this.pool.query(
          `INSERT INTO users (
            id, email, password, role, name, phone, house_number, specialty, points, 
            badges, avatar_url, username, residence_type, residence_start_date, 
            tenancy_history, last_logged_in, active_sessions, capabilities, latitude, longitude
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [
            user.id,
            user.email,
            user.password || null,
            user.role,
            user.name,
            user.phone,
            user.role === "resident" ? user.houseNumber || null : null,
            user.role === "contractor" ? user.specialty || null : null,
            points,
            badges,
            user.avatarUrl || null,
            user.username,
            user.residenceType || null,
            user.residenceStartDate || null,
            JSON.stringify(history),
            user.lastLoggedIn || null,
            JSON.stringify(sessions),
            user.capabilities || [],
            lat,
            lng,
          ]
        );
        return { ...user, points, badges, tenancyHistory: history, activeSessions: sessions, capabilities: user.capabilities || [], latitude: lat, longitude: lng };
      } catch (err) {
        console.error("[UserRepository Database Error] create failed:", err);
        throw new Error("Database error while creating user account.");
      }
    }
    const local = this.readLocalDB();
    const newUser = { ...user, points, badges, tenancyHistory: history, activeSessions: sessions };
    local.users.push(newUser);
    this.writeLocalDB(local);
    return newUser;
  }

  async update(user: User & { password?: string }): Promise<User> {
    const history = user.tenancyHistory || [];
    const sessions = user.activeSessions || [];
    if (this.pool) {
      try {
        await this.pool.query(
          `UPDATE users SET 
            email = $1, role = $2, name = $3, phone = $4, house_number = $5, specialty = $6, 
            points = $7, badges = $8, avatar_url = $9, username = $10, residence_type = $11,
            residence_start_date = $12, tenancy_history = $13, last_logged_in = $14, active_sessions = $15,
            capabilities = $16, latitude = $17, longitude = $18
          WHERE id = $19`,
          [
            user.email,
            user.role,
            user.name,
            user.phone,
            user.role === "resident" ? user.houseNumber || null : null,
            user.role === "contractor" ? user.specialty || null : null,
            user.points || 0,
            user.badges || [],
            user.avatarUrl || null,
            user.username,
            user.residenceType || null,
            user.residenceStartDate || null,
            JSON.stringify(history),
            user.lastLoggedIn || null,
            JSON.stringify(sessions),
            user.capabilities || [],
            user.latitude !== undefined ? user.latitude : null,
            user.longitude !== undefined ? user.longitude : null,
            user.id,
          ]
        );
        return user;
      } catch (err) {
        console.error("[UserRepository Database Error] update failed:", err);
        throw new Error("Database error while updating user account.");
      }
    }
    const local = this.readLocalDB();
    const index = local.users.findIndex((u: any) => u.id === user.id);
    if (index !== -1) {
      local.users[index] = { ...local.users[index], ...user };
      this.writeLocalDB(local);
    }
    return user;
  }

  async rewardPoints(userId: string, points: number): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.query("UPDATE users SET points = points + $1 WHERE id = $2", [points, userId]);
        
        // Award badge milestones dynamically in database
        const res = await this.pool.query("SELECT points, badges, role FROM users WHERE id = $1", [userId]);
        if (res.rows.length > 0) {
          const userPoints = res.rows[0].points;
          const userBadges: string[] = res.rows[0].badges || [];
          const userRole = res.rows[0].role;
          const newBadges = [...userBadges];
 
          if (userPoints >= 100 && !newBadges.includes("Civic Champion")) {
            newBadges.push("Civic Champion");
          }
          if (userPoints >= 200 && !newBadges.includes("Elite Warden")) {
            newBadges.push("Elite Warden");
          }
          if (userRole === "contractor" && userPoints >= 200 && !newBadges.includes("Eco Hero")) {
            newBadges.push("Eco Hero");
          }

          if (newBadges.length > userBadges.length) {
            await this.pool.query("UPDATE users SET badges = $1 WHERE id = $2", [newBadges, userId]);
          }
        }
        return;
      } catch (err) {
        console.error("[UserRepository Database Error] rewardPoints failed:", err);
        throw new Error("Database error while rewarding points.");
      }
    }
    const local = this.readLocalDB();
    const u = local.users.find((user: any) => user.id === userId);
    if (u) {
      u.points = (u.points || 0) + points;
      u.badges = u.badges || [];
      if (u.points >= 100 && !u.badges.includes("Civic Champion")) {
        u.badges.push("Civic Champion");
      }
      if (u.points >= 200 && !u.badges.includes("Elite Warden")) {
        u.badges.push("Elite Warden");
      }
      this.writeLocalDB(local);
    }
  }
}
