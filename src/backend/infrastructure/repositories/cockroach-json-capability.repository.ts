import { Pool } from "pg";
import { CapabilityGroupRepository, CapabilityRepository } from "../../domain/repositories/capability.repository";
import { Capability, CapabilityGroup } from "../../../types";

export class CockroachJsonCapabilityGroupRepository implements CapabilityGroupRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private mapRowToGroup(row: any): CapabilityGroup {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
    };
  }

  async findAll(): Promise<CapabilityGroup[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM capability_groups ORDER BY name ASC");
        return res.rows.map(row => this.mapRowToGroup(row));
      } catch (err) {
        console.error("[CapabilityGroupRepository Database Error] findAll failed:", err);
        throw new Error("Database error while fetching capability groups.");
      }
    }
    const db = this.readLocalDB();
    return db.capabilityGroups || [];
  }

  async findById(id: string): Promise<CapabilityGroup | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM capability_groups WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        return this.mapRowToGroup(res.rows[0]);
      } catch (err) {
        console.error("[CapabilityGroupRepository Database Error] findById failed:", err);
        throw new Error("Database error while fetching capability group.");
      }
    }
    const db = this.readLocalDB();
    return (db.capabilityGroups || []).find((g: any) => g.id === id) || null;
  }

  async create(group: CapabilityGroup): Promise<CapabilityGroup> {
    if (this.pool) {
      try {
        await this.pool.query(
          "INSERT INTO capability_groups (id, name, description) VALUES ($1, $2, $3)",
          [group.id, group.name, group.description || null]
        );
        return group;
      } catch (err) {
        console.error("[CapabilityGroupRepository Database Error] create failed:", err);
        throw new Error("Database error while creating capability group.");
      }
    }
    const db = this.readLocalDB();
    db.capabilityGroups = db.capabilityGroups || [];
    db.capabilityGroups.push(group);
    this.writeLocalDB(db);
    return group;
  }

  async update(group: CapabilityGroup): Promise<CapabilityGroup> {
    if (this.pool) {
      try {
        await this.pool.query(
          "UPDATE capability_groups SET name = $1, description = $2 WHERE id = $3",
          [group.name, group.description || null, group.id]
        );
        return group;
      } catch (err) {
        console.error("[CapabilityGroupRepository Database Error] update failed:", err);
        throw new Error("Database error while updating capability group.");
      }
    }
    const db = this.readLocalDB();
    db.capabilityGroups = db.capabilityGroups || [];
    const index = db.capabilityGroups.findIndex((g: any) => g.id === group.id);
    if (index !== -1) {
      db.capabilityGroups[index] = group;
      this.writeLocalDB(db);
    }
    return group;
  }

  async delete(id: string): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.query("DELETE FROM capability_groups WHERE id = $1", [id]);
        return;
      } catch (err) {
        console.error("[CapabilityGroupRepository Database Error] delete failed:", err);
        throw new Error("Database error while deleting capability group.");
      }
    }
    const db = this.readLocalDB();
    db.capabilityGroups = (db.capabilityGroups || []).filter((g: any) => g.id !== id);
    db.capabilities = (db.capabilities || []).filter((c: any) => c.groupId !== id);
    this.writeLocalDB(db);
  }
}

export class CockroachJsonCapabilityRepository implements CapabilityRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private mapRowToCapability(row: any): Capability {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrls: row.image_urls || [],
      groupId: row.group_id,
    };
  }

  async findAll(): Promise<Capability[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM capabilities ORDER BY name ASC");
        return res.rows.map(row => this.mapRowToCapability(row));
      } catch (err) {
        console.error("[CapabilityRepository Database Error] findAll failed:", err);
        throw new Error("Database error while fetching capabilities.");
      }
    }
    const db = this.readLocalDB();
    return db.capabilities || [];
  }

  async findById(id: string): Promise<Capability | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM capabilities WHERE id = $1", [id]);
        if (res.rows.length === 0) return null;
        return this.mapRowToCapability(res.rows[0]);
      } catch (err) {
        console.error("[CapabilityRepository Database Error] findById failed:", err);
        throw new Error("Database error while fetching capability.");
      }
    }
    const db = this.readLocalDB();
    return (db.capabilities || []).find((c: any) => c.id === id) || null;
  }

  async findByGroupId(groupId: string): Promise<Capability[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM capabilities WHERE group_id = $1 ORDER BY name ASC", [groupId]);
        return res.rows.map(row => this.mapRowToCapability(row));
      } catch (err) {
        console.error("[CapabilityRepository Database Error] findByGroupId failed:", err);
        throw new Error("Database error while filtering capabilities by group.");
      }
    }
    const db = this.readLocalDB();
    return (db.capabilities || []).filter((c: any) => c.groupId === groupId);
  }

  async create(capability: Capability): Promise<Capability> {
    if (this.pool) {
      try {
        await this.pool.query(
          "INSERT INTO capabilities (id, name, description, image_urls, group_id) VALUES ($1, $2, $3, $4, $5)",
          [capability.id, capability.name, capability.description, capability.imageUrls, capability.groupId]
        );
        return capability;
      } catch (err) {
        console.error("[CapabilityRepository Database Error] create failed:", err);
        throw new Error("Database error while creating capability.");
      }
    }
    const db = this.readLocalDB();
    db.capabilities = db.capabilities || [];
    db.capabilities.push(capability);
    this.writeLocalDB(db);
    return capability;
  }

  async update(capability: Capability): Promise<Capability> {
    if (this.pool) {
      try {
        await this.pool.query(
          "UPDATE capabilities SET name = $1, description = $2, image_urls = $3, group_id = $4 WHERE id = $5",
          [capability.name, capability.description, capability.imageUrls, capability.groupId, capability.id]
        );
        return capability;
      } catch (err) {
        console.error("[CapabilityRepository Database Error] update failed:", err);
        throw new Error("Database error while updating capability.");
      }
    }
    const db = this.readLocalDB();
    db.capabilities = db.capabilities || [];
    const index = db.capabilities.findIndex((c: any) => c.id === capability.id);
    if (index !== -1) {
      db.capabilities[index] = capability;
      this.writeLocalDB(db);
    }
    return capability;
  }

  async delete(id: string): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.query("DELETE FROM capabilities WHERE id = $1", [id]);
        return;
      } catch (err) {
        console.error("[CapabilityRepository Database Error] delete failed:", err);
        throw new Error("Database error while deleting capability.");
      }
    }
    const db = this.readLocalDB();
    db.capabilities = (db.capabilities || []).filter((c: any) => c.id !== id);
    this.writeLocalDB(db);
  }
}
