import crypto from "crypto";
import { UserRepository } from "../domain/repositories/user.repository";
import { User } from "../../types";

export class AuthUseCase {
  constructor(private userRepo: UserRepository) {}

  private async generateUniqueUsername(name: string): Promise<string> {
    const clean = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    
    const base = clean || "hero";
    let candidate = base;
    let existing = await this.userRepo.findByUsername(candidate);
    if (!existing) return candidate;

    for (let i = 0; i < 100; i++) {
      const rand = Math.floor(100 + Math.random() * 900); // 3-digit random suffix
      candidate = `${base}_${rand}`;
      existing = await this.userRepo.findByUsername(candidate);
      if (!existing) return candidate;
    }
    return `${base}_${Date.now()}`;
  }

  private getDeviceName(userAgent?: string): string {
    if (!userAgent) return "Unknown Device";
    const ua = userAgent.toLowerCase();
    let os = "Unknown OS";
    if (ua.includes("macintosh") || ua.includes("mac os")) os = "Mac";
    else if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
    else if (ua.includes("android")) os = "Android";
    else if (ua.includes("linux")) os = "Linux";

    let browser = "Unknown Browser";
    if (ua.includes("chrome") || ua.includes("chromium")) browser = "Chrome";
    else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("edge")) browser = "Edge";
    else if (ua.includes("opera")) browser = "Opera";

    return `${os} - ${browser}`;
  }

  async register(
    data: {
      email: string;
      password?: string;
      name?: string;
      role?: "resident" | "contractor" | "admin";
      avatarUrl?: string;
      phone?: string;
      residenceType?: "owner" | "renter";
      residenceStartDate?: string;
    },
    userAgent?: string
  ): Promise<{ user: User; sessionId: string }> {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new Error("Email is already registered.");
    }

    const emailPrefix = data.email.split("@")[0];
    const displayName = data.name || emailPrefix;
    const username = await this.generateUniqueUsername(displayName);

    const sessionId = crypto.randomUUID();
    const deviceName = this.getDeviceName(userAgent);
    const now = new Date().toISOString();
    const session = { sessionId, deviceName, lastUsedAt: now };

    const passwordToHash = data.password || "default123";
    const hashedPassword = crypto.scryptSync(passwordToHash, 'salt', 64).toString('hex');

    const newUser: User & { password?: string } = {
      id: crypto.randomUUID(),
      email: data.email,
      password: hashedPassword,
      role: data.role || "resident",
      name: displayName,
      phone: data.phone || "N/A",
      points: 0,
      badges: [],
      avatarUrl: data.avatarUrl,
      username,
      residenceType: data.residenceType,
      residenceStartDate: data.residenceStartDate,
      tenancyHistory: data.residenceType ? [{ residenceType: data.residenceType, changedAt: now }] : [],
      lastLoggedIn: now,
      activeSessions: [session],
      capabilities: [],
    };

    const saved = await this.userRepo.create(newUser);
    const { password: _, ...userWithoutPassword } = saved as any;
    return { user: userWithoutPassword as User, sessionId };
  }

  async login(
    email: string,
    password?: string,
    userAgent?: string
  ): Promise<{ user: User; sessionId: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password.");
    }

    const storedPassword = (user as any).password;
    if (storedPassword) {
      if (!password) {
        throw new Error("Invalid email or password.");
      }
      const hashedInput = crypto.scryptSync(password, 'salt', 64).toString('hex');
      const passwordMatch = hashedInput === storedPassword;
      if (!passwordMatch) {
        throw new Error("Invalid email or password.");
      }
    }

    const sessionId = crypto.randomUUID();
    const deviceName = this.getDeviceName(userAgent);
    const now = new Date().toISOString();
    const session = { sessionId, deviceName, lastUsedAt: now };

    // Append new session and update last logged in date
    const sessions = user.activeSessions || [];
    sessions.push(session);

    user.lastLoggedIn = now;
    user.activeSessions = sessions;

    const saved = await this.userRepo.update(user);
    const { password: _, ...userWithoutPassword } = saved as any;
    return { user: userWithoutPassword as User, sessionId };
  }

  async listUsers(): Promise<User[]> {
    return await this.userRepo.findAll();
  }

  async updateProfile(
    userId: string,
    data: {
      name: string;
      username: string;
      phone: string;
      role?: "resident" | "contractor" | "admin";
      houseNumber?: string;
      specialty?: string;
      avatarUrl?: string;
      residenceType?: "owner" | "renter";
      residenceStartDate?: string;
      capabilities?: string[];
    }
  ): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error("User account not found.");
    }

    const cleanedHandle = data.username.trim().replace(/^@/, "");
    if (cleanedHandle.length < 3) {
      throw new Error("Username handle must be at least 3 characters long.");
    }
    if (!/^[a-z0-9_]+$/.test(cleanedHandle)) {
      throw new Error("Username handle can only contain lowercase letters, numbers, and underscores.");
    }

    if (cleanedHandle.toLowerCase() !== (user.username || "").toLowerCase()) {
      const existing = await this.userRepo.findByUsername(cleanedHandle);
      if (existing) {
        throw new Error("This username handle is already taken.");
      }
    }

    // Handle role changes
    if (data.role && user.role !== data.role) {
      user.role = data.role;
      if (user.role === "resident") {
        user.specialty = undefined;
        user.capabilities = undefined;
      } else if (user.role === "contractor") {
        user.houseNumber = undefined;
        user.residenceType = undefined;
        user.residenceStartDate = undefined;
      }
    }

    // 7-day rule check for residenceType updates
    const history = user.tenancyHistory || [];
    if (user.role === "resident" && data.residenceType && user.residenceType !== data.residenceType) {
      if (history.length > 0) {
        const sorted = [...history].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
        const latest = sorted[0];
        const lastChangedMs = new Date(latest.changedAt).getTime();
        const diffMs = Date.now() - lastChangedMs;
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        
        if (diffMs < oneWeekMs) {
          const daysLeft = Math.ceil((oneWeekMs - diffMs) / (24 * 60 * 60 * 1000));
          throw new Error(`Tenancy status can only be updated once per week. Please wait ${daysLeft} more day(s).`);
        }
      }
      
      user.residenceType = data.residenceType;
      history.push({
        residenceType: data.residenceType,
        changedAt: new Date().toISOString(),
      });
      user.tenancyHistory = history;
    }

    user.name = data.name;
    user.username = cleanedHandle;
    user.phone = data.phone;
    if (user.role === "resident") {
      user.houseNumber = data.houseNumber;
      user.residenceStartDate = data.residenceStartDate;
      user.capabilities = undefined;
    } else if (user.role === "contractor") {
      user.specialty = data.specialty;
      user.capabilities = data.capabilities || [];
    }
    if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl;
    }

    const saved = await this.userRepo.update(user);
    const { password: _, ...userWithoutPassword } = saved as any;
    return userWithoutPassword as User;
  }
}
