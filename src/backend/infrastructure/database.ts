import pg from "pg";
import * as path from "path";
import * as fs from "fs";
import { User, Issue, Survey, Notification, Campaign } from "../../types";

const { Pool } = pg;

const DB_FILE = path.join(process.cwd(), "db.json");
const dbUrl = process.env.DATABASE_URL;
export let pool: pg.Pool | null = null;

if (dbUrl) {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    console.log("CockroachDB connection pool initialized in Infrastructure.");
  } catch (e) {
    console.error("Failed to initialize CockroachDB connection pool:", e);
  }
} else {
  console.log("DATABASE_URL not set. Running in local JSON database mode.");
}

export interface DB {
  users: (User & { password?: string })[];
  issues: Issue[];
  surveys: Survey[];
  notifications: Notification[];
  campaigns: Campaign[];
  payments: any[];
}


export const defaultDB: DB = {
  users: [
    {
      id: "00000000-0000-4000-a000-000000000001",
      email: "admin@community.org",
      password: "admin123",
      role: "admin",
      name: "Elected Official (Admin)",
      phone: "+1 555-0100",
      points: 0,
      badges: [],
      username: "elected_admin",
      tenancyHistory: [],
    },
    {
      id: "00000000-0000-4000-a000-000000000002",
      email: "john@resident.com",
      password: "john123",
      role: "resident",
      name: "John Resident",
      phone: "+1 555-0199",
      houseNumber: "A-12",
      points: 120,
      badges: ["Water Watchdog", "Civic Leader"],
      username: "john_resident",
      residenceType: "owner",
      residenceStartDate: "2026-01-15",
      tenancyHistory: [
        { residenceType: "owner", changedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
      ],
    },
    {
      id: "00000000-0000-4000-a000-000000000003",
      email: "plumber@service.com",
      password: "plumber123",
      role: "contractor",
      name: "Bob's Plumbing Co.",
      phone: "+1 555-0144",
      specialty: "Plumber",
      points: 80,
      badges: ["Leak Buster"],
      username: "bobs_plumbing",
      tenancyHistory: [],
    },
    {
      id: "00000000-0000-4000-a000-000000000004",
      email: "electrician@service.com",
      password: "electrician123",
      role: "contractor",
      name: "Sparky Electrical",
      phone: "+1 555-0155",
      specialty: "Electrician",
      points: 150,
      badges: ["Master Spark", "Active Contractor"],
      username: "sparky_electrical",
      tenancyHistory: [],
    },
  ],
  issues: [
    {
      id: "11111111-1111-4111-b111-111111111111",
      title: "Major Main Line Water Leakage",
      description: "Water has been leaking from the pavement near house A-12. It's pooling and causing damage to the sidewalk. Constant stream of clean water going to waste.",
      category: "Water Leakage",
      severity: "High",
      wasteCaused: "Estimated 1,200 liters of treated water lost per day.",
      status: "Reported",
      reporterId: "00000000-0000-4000-a000-000000000002",
      reporterName: "John Resident",
      reporterHouse: "A-12",
      upvotes: ["00000000-0000-4000-a000-000000000002"],
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      daysUnattended: 4,
      beforeImages: [],
      beforeVideos: [],
      afterImages: [],
      afterVideos: [],
      latitude: 12.9716,
      longitude: 77.5946,
      followers: ["00000000-0000-4000-a000-000000000002"],
    },
    {
      id: "22222222-2222-4222-b222-222222222222",
      title: "Broken Streetlight on Lane 4",
      description: "Streetlight outside of Lane 4 has been flickering and is now completely out. Makes the area feel unsafe at night.",
      category: "Electricity Out",
      severity: "Medium",
      wasteCaused: "Increased security hazard. No energy waste but severe public risk.",
      status: "Assigned",
      reporterId: "00000000-0000-4000-a000-000000000002",
      reporterName: "John Resident",
      reporterHouse: "A-12",
      upvotes: [],
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      daysUnattended: 6,
      assignedContractorId: "00000000-0000-4000-a000-000000000004",
      assignedContractorName: "Sparky Electrical",
      priceQuote: 180,
      isPaid: false,
      beforeImages: [],
      beforeVideos: [],
      afterImages: [],
      afterVideos: [],
      latitude: 12.9725,
      longitude: 77.5932,
      followers: ["00000000-0000-4000-a000-000000000002"],
    },
  ],
  surveys: [
    {
      id: "33333333-3333-4333-b333-333333333333",
      month: "June 2026",
      residentId: "00000000-0000-4000-a000-000000000002",
      residentName: "John Resident",
      overallHappiness: 4,
      localServicesRating: 3,
      roadQualityRating: 2,
      cleanlinessRating: 4,
      feedbackText: "The waste management is good, but pothole repairs and broken streetlights take too long to resolve.",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  notifications: [
    {
      id: "44444444-4444-4444-b444-444444444444",
      userId: "00000000-0000-4000-a000-000000000002",
      title: "Issue Status Update",
      message: "Your reported issue 'Broken Streetlight on Lane 4' has been assigned to Sparky Electrical.",
      read: false,
      createdAt: new Date().toISOString(),
    },
  ],
  campaigns: [
    {
      id: "a1111111-1111-4111-b111-111111111111",
      title: "Weekend Park Clean-up Drive",
      description: "Help clean up the central community park. Trash bags and gloves will be provided by the municipality.",
      category: "Cleaning",
      creatorId: "00000000-0000-4000-a000-000000000001",
      creatorName: "Elected Official (Admin)",
      location: "Central Community Park",
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      attendees: ["00000000-0000-4000-a000-000000000002"],
      maxAttendees: 30,
      status: "Upcoming"
    },
    {
      id: "a2222222-2222-4222-b222-222222222222",
      title: "Street Canopy Planting Drive",
      description: "Let's plant native shade saplings along Lane 2 to restore our green canopy.",
      category: "Planting",
      creatorId: "00000000-0000-4000-a000-000000000002",
      creatorName: "John Resident",
      location: "Lane 2 Side walkways",
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      attendees: ["00000000-0000-4000-a000-000000000002"],
      maxAttendees: 15,
      status: "Upcoming"
    }
  ],
  payments: []
};

export function readDB(): DB {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultWithPayments = { ...defaultDB, payments: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultWithPayments, null, 2));
      return defaultWithPayments as DB;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!parsed.payments) parsed.payments = [];
    return parsed;
  } catch (e) {
    console.error("Error reading database file, returning defaults", e);
    return { ...defaultDB, payments: [] } as DB;
  }
}

export function writeDB(db: DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Error writing to database file", e);
  }
}

export async function initDb() {
  if (!pool) {
    console.log("Using local JSON file database fallback.");
    readDB();
    return;
  }

  try {
    console.log("Initializing CockroachDB tables...");
    
    // Recreate tables to apply the new schema columns (no backward compatibility needed)
    await pool.query("DROP TABLE IF EXISTS capability_groups CASCADE");
    await pool.query("DROP TABLE IF EXISTS capabilities CASCADE");
    await pool.query("DROP TABLE IF EXISTS users CASCADE");
    await pool.query("DROP TABLE IF EXISTS issues CASCADE");
    await pool.query("DROP TABLE IF EXISTS campaigns CASCADE");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS capability_groups (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS capabilities (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT NOT NULL,
        image_urls TEXT[] DEFAULT '{}',
        group_id VARCHAR(255) REFERENCES capability_groups(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        house_number VARCHAR(255),
        specialty VARCHAR(255),
        points INT DEFAULT 0,
        badges TEXT[] DEFAULT '{}',
        avatar_url VARCHAR(255),
        username VARCHAR(255) UNIQUE NOT NULL,
        residence_type VARCHAR(50),
        residence_start_date VARCHAR(50),
        tenancy_history TEXT DEFAULT '[]',
        last_logged_in VARCHAR(50),
        active_sessions TEXT DEFAULT '[]',
        capabilities TEXT[] DEFAULT '{}',
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id VARCHAR(255) PRIMARY KEY,
        display_id VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(255) NOT NULL,
        capability_id VARCHAR(255) REFERENCES capabilities(id) ON DELETE SET NULL,
        severity VARCHAR(50) NOT NULL,
        waste_caused TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        reporter_id VARCHAR(255) NOT NULL,
        reporter_name VARCHAR(255) NOT NULL,
        reporter_house VARCHAR(255) NOT NULL,
        upvotes TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        days_unattended INT NOT NULL,
        assigned_contractor_id VARCHAR(255),
        assigned_contractor_name VARCHAR(255),
        resolution_notes TEXT,
        price_quote NUMERIC,
        is_paid BOOLEAN DEFAULT FALSE,
        before_images TEXT[] DEFAULT '{}',
        before_videos TEXT[] DEFAULT '{}',
        after_images TEXT[] DEFAULT '{}',
        after_videos TEXT[] DEFAULT '{}',
        latitude NUMERIC,
        longitude NUMERIC,
        followers TEXT[] DEFAULT '{}',
        duplicate_of_issue_id VARCHAR(255),
        is_reviewed BOOLEAN DEFAULT FALSE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id VARCHAR(255) PRIMARY KEY,
        month VARCHAR(255) NOT NULL,
        resident_id VARCHAR(255) NOT NULL,
        resident_name VARCHAR(255) NOT NULL,
        overall_happiness INT NOT NULL,
        local_services_rating INT NOT NULL,
        road_quality_rating INT NOT NULL,
        cleanliness_rating INT NOT NULL,
        feedback_text TEXT,
        date TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        target_issue_id VARCHAR(255),
        target_type VARCHAR(50)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        creator_id VARCHAR(255) NOT NULL,
        creator_name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        date VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        attendees TEXT[] DEFAULT '{}',
        max_attendees INT,
        status VARCHAR(50) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id VARCHAR(255) PRIMARY KEY,
        issue_id VARCHAR(255) REFERENCES issues(id) ON DELETE CASCADE,
        contractor_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        contractor_name VARCHAR(255) NOT NULL,
        materials_cost DOUBLE PRECISION NOT NULL,
        labor_cost DOUBLE PRECISION NOT NULL,
        estimated_hours INT NOT NULL,
        proposal_notes TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        counter_amount DOUBLE PRECISION,
        counter_status VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await pool.query(`ALTER TABLE bids ADD COLUMN IF NOT EXISTS counter_amount DOUBLE PRECISION;`);
    await pool.query(`ALTER TABLE bids ADD COLUMN IF NOT EXISTS counter_status VARCHAR(50);`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bid_comments (
        id VARCHAR(255) PRIMARY KEY,
        bid_id VARCHAR(255) REFERENCES bids(id) ON DELETE CASCADE,
        sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        sender_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS issue_timeline (
        id VARCHAR(255) PRIMARY KEY,
        issue_id VARCHAR(255) REFERENCES issues(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        creator_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        creator_name VARCHAR(255),
        creator_role VARCHAR(50),
        is_system BOOLEAN DEFAULT TRUE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        scheduled_date VARCHAR(50),
        start_time VARCHAR(50),
        end_time VARCHAR(50),
        affected_areas TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        creator_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS issue_messages (
        id VARCHAR(255) PRIMARY KEY,
        issue_id VARCHAR(255) REFERENCES issues(id) ON DELETE CASCADE,
        sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        sender_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        issue_id VARCHAR(255) REFERENCES issues(id) ON DELETE CASCADE,
        contractor_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        contractor_name VARCHAR(255) NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        method VARCHAR(50) NOT NULL DEFAULT 'Cash',
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        proof_url VARCHAR(500),
        notes TEXT,
        authorized_by_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        authorized_by_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        paid_at TIMESTAMP WITH TIME ZONE,
        due_by_days INT DEFAULT 14,
        resolution_date TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Ensure new columns are added if the tables already existed (for backward-compatibility)
    try {
      await pool.query("ALTER TABLE issues ADD COLUMN IF NOT EXISTS duplicate_of_issue_id VARCHAR(255)");
      await pool.query("ALTER TABLE issues ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE");
      await pool.query("ALTER TABLE issues ADD COLUMN IF NOT EXISTS display_id VARCHAR(50)");
    } catch (colErr) {
      console.error("Failed to dynamically add columns to issues table:", colErr);
    }

    console.log("CockroachDB tables verified/created.");

    // Seed if empty
    const groupsCount = await pool.query("SELECT COUNT(*) FROM capability_groups");
    if (parseInt(groupsCount.rows[0].count, 10) === 0) {
      console.log("Seeding capability groups and capabilities...");
      
      const seedGroups = [
        { id: "group-plumbing", name: "Plumbing & Drainage", description: "Issues regarding water pipes, leakages, and municipal drains." },
        { id: "group-civil", name: "Civil & Roadwork", description: "Pothole repair, pavements, signs, and sidewalk blockages." },
        { id: "group-cleaning", name: "Cleaning & Garbage", description: "Trash clearance, landscaping, and public space maintenance." },
        { id: "group-electrical", name: "Electrical & Power", description: "Streetlights and municipal power systems." },
        { id: "group-public", name: "Public Facilities", description: "Parks, playgrounds, and shared spaces." },
      ];

      const seedCaps = [
        { id: "cap-water-leakage", name: "Water Leakage", description: "Pipes leaking, main lines damaged, or hydrants leaking water in the streets.", imageUrls: ["/assets/leakage.png"], groupId: "group-plumbing" },
        { id: "cap-drainage-block", name: "Drainage Blockage", description: "Sewer overflow, blocked storm drains, or standing wastewater.", imageUrls: [], groupId: "group-plumbing" },
        { id: "cap-road-repair", name: "Road Repair", description: "Potholes, cracks in asphalt, or damaged sidewalk pavements.", imageUrls: ["/assets/pothole.png"], groupId: "group-civil" },
        { id: "cap-traffic-signs", name: "Traffic Signs & Barriers", description: "Broken street signs, knocked down barriers, or missing lane markers.", imageUrls: [], groupId: "group-civil" },
        { id: "cap-garbage-disposal", name: "Garbage Disposal", description: "Overfilled bins, illegal trash dumping, or debris blocking public pathways.", imageUrls: ["/assets/garbage.png"], groupId: "group-cleaning" },
        { id: "cap-plants-overgrown", name: "Plants Overgrown", description: "Overhanging tree branches, overgrown grass blocking sidewalks, or weed infestation.", imageUrls: [], groupId: "group-cleaning" },
        { id: "cap-electricity-out", name: "Electricity Out", description: "Flickering or completely dark streetlights, exposed wires, or power outages.", imageUrls: ["/assets/streetlight.png"], groupId: "group-electrical" },
        { id: "cap-public-infra", name: "Public Infrastructure", description: "Damaged park benches, broken playground equipment, or community center upkeep.", imageUrls: [], groupId: "group-public" },
      ];

      for (const g of seedGroups) {
        await pool.query("INSERT INTO capability_groups (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [g.id, g.name, g.description]);
      }

      for (const c of seedCaps) {
        await pool.query("INSERT INTO capabilities (id, name, description, image_urls, group_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING", [c.id, c.name, c.description, c.imageUrls, c.groupId]);
      }
    }

    const usersCount = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(usersCount.rows[0].count, 10) === 0) {
      console.log("CockroachDB is empty. Seeding initial data from local DB...");
      const localData = readDB();

      for (const u of localData.users) {
        let userCaps: string[] = [];
        if (u.role === "contractor") {
          if (u.specialty === "Plumber") userCaps = ["cap-water-leakage", "cap-drainage-block"];
          else if (u.specialty === "Electrician") userCaps = ["cap-electricity-out"];
          else if (u.specialty === "Waste Management") userCaps = ["cap-garbage-disposal"];
          else if (u.specialty === "Gardening") userCaps = ["cap-plants-overgrown"];
          else if (u.specialty === "Roads") userCaps = ["cap-road-repair", "cap-traffic-signs"];
        }

        const lat = 12.970 + Math.random() * 0.005;
        const lng = 77.590 + Math.random() * 0.005;

        await pool.query(
          "INSERT INTO users (id, email, password, role, name, phone, house_number, specialty, points, badges, avatar_url, username, residence_type, residence_start_date, tenancy_history, last_logged_in, active_sessions, capabilities, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) ON CONFLICT (id) DO NOTHING",
          [u.id, u.email, u.password || null, u.role, u.name, u.phone, u.houseNumber || null, u.specialty || null, u.points || 0, u.badges || [], u.avatarUrl || null, u.username || `user_${u.id}`, u.residenceType || null, u.residenceStartDate || null, JSON.stringify(u.tenancyHistory || []), u.lastLoggedIn || null, JSON.stringify(u.activeSessions || []), userCaps, lat, lng]
        );
      }

      // Seed a default announcement
      const adminUser = localData.users.find((usr: any) => usr.role === "admin");
      if (adminUser) {
        await pool.query(
          `INSERT INTO announcements (id, title, description, category, scheduled_date, start_time, end_time, affected_areas, created_at, creator_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
          [
            "announcement-1",
            "Scheduled Power Grid Maintenance",
            "State electrical grid maintenance will take place this upcoming weekend. Power supply will be cut off temporarily to verify transformer safety.",
            "Electricity Outage",
            new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            "10:00",
            "14:00",
            ["Main Boulevard", "Lanes 1 to 5"],
            new Date(),
            adminUser.id
          ]
        );
      }

      let seedIndex = 1;
      for (const iss of localData.issues) {
        let capId = "cap-public-infra";
        if (iss.category === "Water Leakage") capId = "cap-water-leakage";
        else if (iss.category === "Electricity Out" || iss.category === "Damaged Streetlight") capId = "cap-electricity-out";
        else if (iss.category === "Garbage Disposal" || iss.category === "Waste Management" || iss.category === "Cleaning") capId = "cap-garbage-disposal";
        else if (iss.category === "Plants Overgrown" || iss.category === "Planting") capId = "cap-plants-overgrown";
        else if (iss.category === "Road Repair" || iss.category === "Pothole") capId = "cap-road-repair";

        const displayId = `CH-${seedIndex.toString().padStart(4, "0")}`;
        seedIndex++;

        await pool.query(
          `INSERT INTO issues (
            id, display_id, title, description, category, capability_id, severity, waste_caused, status, 
            reporter_id, reporter_name, reporter_house, upvotes, created_at, days_unattended,
            assigned_contractor_id, assigned_contractor_name, resolution_notes, price_quote, is_paid,
            before_images, before_videos, after_images, after_videos, latitude, longitude, followers
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) ON CONFLICT (id) DO NOTHING`,
          [
            iss.id, displayId, iss.title, iss.description, iss.category, capId, iss.severity, iss.wasteCaused, iss.status,
            iss.reporterId, iss.reporterName, iss.reporterHouse, iss.upvotes || [], new Date(iss.createdAt), iss.daysUnattended,
            iss.assignedContractorId || null, iss.assignedContractorName || null, iss.resolutionNotes || null, iss.priceQuote || null, iss.isPaid || false,
            iss.beforeImages || [], iss.beforeVideos || [], iss.afterImages || [], iss.afterVideos || [],
            iss.latitude || 12.9716, iss.longitude || 77.5946, iss.followers || [iss.reporterId]
          ]
        );
      }

      for (const s of localData.surveys) {
        await pool.query(
          `INSERT INTO surveys (
            id, month, resident_id, resident_name, overall_happiness, 
            local_services_rating, road_quality_rating, cleanliness_rating, feedback_text, date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
          [
            s.id, s.month, s.residentId, s.residentName, s.overallHappiness,
            s.localServicesRating, s.roadQualityRating, s.cleanlinessRating, s.feedbackText || null, new Date(s.date)
          ]
        );
      }

      for (const n of localData.notifications) {
        await pool.query(
          "INSERT INTO notifications (id, user_id, title, message, read, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING",
          [n.id, n.userId, n.title, n.message, n.read, new Date(n.createdAt)]
        );
      }

      for (const c of localData.campaigns || []) {
        await pool.query(
          "INSERT INTO campaigns (id, title, description, category, creator_id, creator_name, location, date, created_at, attendees, max_attendees, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING",
          [c.id, c.title, c.description, c.category, c.creatorId, c.creatorName, c.location, c.date, new Date(c.createdAt), c.attendees || [], c.maxAttendees || null, c.status]
        );
      }
      console.log("CockroachDB seeding completed.");
    }
  } catch (err) {
    console.error("Error initializing/seeding CockroachDB:", err);
  }
}
