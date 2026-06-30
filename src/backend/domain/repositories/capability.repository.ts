import { Capability, CapabilityGroup } from "../../../types";

export interface CapabilityGroupRepository {
  findAll(): Promise<CapabilityGroup[]>;
  findById(id: string): Promise<CapabilityGroup | null>;
  create(group: CapabilityGroup): Promise<CapabilityGroup>;
  update(group: CapabilityGroup): Promise<CapabilityGroup>;
  delete(id: string): Promise<void>;
}

export interface CapabilityRepository {
  findAll(): Promise<Capability[]>;
  findById(id: string): Promise<Capability | null>;
  findByGroupId(groupId: string): Promise<Capability[]>;
  create(capability: Capability): Promise<Capability>;
  update(capability: Capability): Promise<Capability>;
  delete(id: string): Promise<void>;
}
