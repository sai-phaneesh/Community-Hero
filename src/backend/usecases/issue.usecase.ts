import crypto from "crypto";
import { IssueRepository } from "../domain/repositories/issue.repository";
import { UserRepository } from "../domain/repositories/user.repository";
import { NotificationRepository } from "../domain/repositories/notification.repository";
import { IssueTimelineRepository } from "../domain/repositories/issue-timeline.repository";
import { PaymentRepository } from "../domain/repositories/payment.repository";
import { Issue, Notification } from "../../types";

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const deltaPhi = (lat2-lat1) * Math.PI/180;
  const deltaLambda = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export class IssueUseCase {
  constructor(
    private issueRepo: IssueRepository,
    private userRepo: UserRepository,
    private notificationRepo: NotificationRepository,
    private timelineRepo: IssueTimelineRepository,
    private paymentRepo: PaymentRepository
  ) {}

  async getIssueById(id: string): Promise<Issue | null> {
    return await this.issueRepo.findById(id);
  }

  async getIssue(id: string): Promise<Issue | null> {
    return await this.issueRepo.findById(id);
  }

  private async notifyAdmins(title: string, message: string, targetIssueId?: string) {
    try {
      const users = await this.userRepo.findAll();
      const admins = users.filter((u) => u.role === "admin");
      for (const admin of admins) {
        await this.createNotification(admin.id, title, message, targetIssueId);
      }
    } catch (err) {
      console.error("Failed to notify admins:", err);
    }
  }

  private async createNotification(userId: string, title: string, message: string, targetIssueId?: string) {
    const notification: Notification = {
      id: crypto.randomUUID(),
      userId,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      targetIssueId,
      targetType: targetIssueId ? "issue" : undefined
    };
    await this.notificationRepo.create(notification);
  }

  private async notifyFollowers(issue: Issue, title: string, message: string, excludeUserId?: string) {
    try {
      const targets = (issue.followers || []).filter(uid => uid !== excludeUserId);
      for (const targetId of targets) {
        await this.createNotification(targetId, title, message, issue.id);
      }
    } catch (err) {
      console.error("Failed to notify issue followers:", err);
    }
  }

  async listIssues(): Promise<Issue[]> {
    return await this.issueRepo.findAll();
  }

  async listIssuesPaginated(limit: number, cursor?: string): Promise<{ items: Issue[], nextCursor?: string }> {
    return await this.issueRepo.findAllPaginated(limit, cursor);
  }

  async reportIssue(data: {
    title: string;
    description: string;
    category?: string;
    capabilityId?: string;
    severity?: "Low" | "Medium" | "High" | "Critical";
    wasteCaused?: string;
    reporterId: string;
    reporterName?: string;
    reporterHouse?: string;
    beforeImages?: string[];
    beforeVideos?: string[];
    latitude?: number;
    longitude?: number;
  }): Promise<Issue> {
    const id = crypto.randomUUID();
    const category = data.category || "Public Infrastructure";
    const severity = data.severity || "Medium";
    const wasteCaused = data.wasteCaused || "TBD during AI audit.";
    const reporterName = data.reporterName || "Anonymous Resident";
    const reporterHouse = data.reporterHouse || "N/A";
    const latitude = data.latitude || (12.970 + Math.random() * 0.005);
    const longitude = data.longitude || (77.590 + Math.random() * 0.005);

    const newIssue: Issue = {
      id,
      title: data.title,
      description: data.description,
      category,
      capabilityId: data.capabilityId,
      severity,
      wasteCaused,
      status: "Reported",
      reporterId: data.reporterId,
      reporterName,
      reporterHouse,
      upvotes: [data.reporterId], // Reporter validates their own issue automatically
      createdAt: new Date().toISOString(),
      daysUnattended: 0,
      isPaid: false,
      beforeImages: data.beforeImages || [],
      beforeVideos: data.beforeVideos || [],
      afterImages: [],
      afterVideos: [],
      latitude,
      longitude,
      followers: [data.reporterId], // Reporter follows issue by default
    };

    const saved = await this.issueRepo.create(newIssue);

    // Record timeline event
    await this.timelineRepo.create({
      id: crypto.randomUUID(),
      issueId: saved.id,
      title: "Report Created",
      description: `Report titled "${saved.title}" was submitted by resident ${reporterName}.`,
      createdAt: new Date().toISOString(),
      creatorId: data.reporterId,
      creatorName: reporterName,
      creatorRole: "resident",
      isSystem: true,
    });

    // Award +20 points to the reporter for taking civic action!
    await this.userRepo.rewardPoints(data.reporterId, 20);

    // Notify admins of new report
    await this.notifyAdmins(
      "New Hyperlocal Issue Reported",
      `"${data.title}" was reported at house ${reporterHouse} (${category}).`,
      saved.id
    );

    // Geo-fencing alert: check proximity for Critical/High issues
    if (severity === "Critical" || severity === "High") {
      try {
        const users = await this.userRepo.findAll();
        for (const u of users) {
          // Skip the reporter
          if (u.id === data.reporterId) continue;
          // Calculate distance if user location is defined
          if (u.latitude !== undefined && u.longitude !== undefined) {
            const dist = getDistanceMeters(latitude, longitude, u.latitude, u.longitude);
            if (dist <= 500) {
              const distanceRounded = Math.round(dist);
              await this.notificationRepo.create({
                id: crypto.randomUUID(),
                userId: u.id,
                title: `[GEOFENCE ALERT] Critical ${category} nearby`,
                message: `Warning: A high-severity report "${data.title}" was published just ${distanceRounded}m from your registered location.`,
                read: false,
                createdAt: new Date().toISOString(),
                targetIssueId: saved.id,
                targetType: "issue"
              });
            }
          }
        }
      } catch (err) {
        console.error("Geo-fencing alert check failed:", err);
      }
    }

    return saved;
  }

  async validateIssue(id: string, validatorId: string): Promise<Issue> {
    const issue = await this.issueRepo.findById(id);
    if (!issue) {
      throw new Error("Issue not found.");
    }

    if (issue.upvotes.includes(validatorId)) {
      throw new Error("You have already validated this report.");
    }

    issue.upvotes.push(validatorId);

    // Reward validator +5 points
    await this.userRepo.rewardPoints(validatorId, 5);

    // Automatically transition to Validated if it reaches 2 validation upvotes
    let statusTransitioned = false;
    if (issue.upvotes.length >= 2 && issue.status === "Reported") {
      issue.status = "Validated";
      statusTransitioned = true;
    }

    const saved = await this.issueRepo.update(issue);

    // Record timeline validation event
    await this.timelineRepo.create({
      id: crypto.randomUUID(),
      issueId: saved.id,
      title: statusTransitioned ? "Issue Validated" : "Validation Received",
      description: statusTransitioned 
        ? `Consensus validation reached! Status updated to Validated.` 
        : `Upvote validation registered by neighbor.`,
      createdAt: new Date().toISOString(),
      creatorId: validatorId,
      isSystem: true,
    });

    // Notify followers
    if (statusTransitioned) {
      // Reward reporter +10 bonus points for a successfully validated issue
      await this.userRepo.rewardPoints(issue.reporterId, 10);

      await this.notifyFollowers(
        saved,
        "Issue Status: Validated",
        `"${issue.title}" has been validated by the community!`,
        validatorId
      );
      // Notify admins
      await this.notifyAdmins(
        "Issue Validated",
        `"${issue.title}" reached community validation consensus.`
      );
    } else {
      await this.notifyFollowers(
        saved,
        "Issue Validated by Neighbor",
        `A neighbor validated the report: "${issue.title}".`,
        validatorId
      );
    }

    return saved;
  }

  async assignIssue(data: { id: string; contractorId: string; priceQuote: number }): Promise<Issue> {
    const issue = await this.issueRepo.findById(idToUse(data.id));
    if (!issue) {
      throw new Error("Issue not found.");
    }

    const contractor = await this.userRepo.findById(data.contractorId);
    if (!contractor || contractor.role !== "contractor") {
      throw new Error("Contractor invalid.");
    }

    issue.assignedContractorId = contractor.id;
    issue.assignedContractorName = contractor.name;
    issue.priceQuote = data.priceQuote;
    issue.status = "Assigned";

    const saved = await this.issueRepo.update(issue);

    // Record timeline assignment
    await this.timelineRepo.create({
      id: crypto.randomUUID(),
      issueId: saved.id,
      title: "Contractor Assigned",
      description: `Assigned to contractor ${contractor.name} at a price quote of $${data.priceQuote}.`,
      createdAt: new Date().toISOString(),
      isSystem: true,
    });

    // Notify followers
    await this.notifyFollowers(
      saved,
      "Repair Assigned",
      `"${issue.title}" is assigned to ${contractor.name} for $${data.priceQuote}.`
    );

    return saved;
  }

  async startProgress(issueId: string, contractorId: string): Promise<Issue> {
    const issue = await this.issueRepo.findById(issueId);
    if (!issue) {
      throw new Error("Issue not found.");
    }
    if (issue.assignedContractorId !== contractorId) {
      throw new Error("You are not assigned to this issue.");
    }

    issue.status = "In Progress";
    const saved = await this.issueRepo.update(issue);

    // Record timeline progress
    await this.timelineRepo.create({
      id: crypto.randomUUID(),
      issueId: saved.id,
      title: "Work Started",
      description: `Contractor started repair progress. Status changed to In Progress.`,
      createdAt: new Date().toISOString(),
      creatorId: contractorId,
      isSystem: true,
    });

    // Notify followers
    await this.notifyFollowers(
      saved,
      "Repair in Progress",
      `Contractor ${issue.assignedContractorName} has started working on "${issue.title}".`
    );

    return saved;
  }

  async resolveIssue(
    id: string,
    contractorId: string,
    resolutionNotes?: string,
    afterImages?: string[],
    afterVideos?: string[]
  ): Promise<Issue> {
    const issue = await this.issueRepo.findById(id);
    if (!issue) {
      throw new Error("Issue not found.");
    }
    if (issue.assignedContractorId !== contractorId) {
      throw new Error("You are not assigned to this issue.");
    }

    const notes = resolutionNotes || "Resolved successfully.";
    const updatedIssue: Issue = {
      ...issue,
      status: "Resolved",
      resolutionNotes: notes,
      afterImages: afterImages || [],
      afterVideos: afterVideos || [],
    };

    const saved = await this.issueRepo.update(updatedIssue);

    // Record resolution event
    await this.timelineRepo.create({
      id: crypto.randomUUID(),
      issueId: saved.id,
      title: "Issue Resolved",
      description: `Repair completed. Resolution notes: "${notes}".`,
      createdAt: new Date().toISOString(),
      creatorId: contractorId,
      isSystem: true,
    });

    // Reward contractor +50 points for resolving the issue!
    await this.userRepo.rewardPoints(contractorId, 50);

    // Notify followers
    await this.notifyFollowers(
      saved,
      "Repair Resolved!",
      `"${issue.title}" has been resolved. Payout release pending administrative review.`,
      contractorId
    );

    // Notify admins
    await this.notifyAdmins(
      "Payout Review Required",
      `Contractor ${issue.assignedContractorName} resolved "${issue.title}". Release $${issue.priceQuote || 0}.`,
      saved.id
    );

    return saved;
  }

  async releasePayment(issueId: string): Promise<Issue> {
    const issue = await this.issueRepo.findById(issueId);
    if (!issue) {
      throw new Error("Issue not found.");
    }
    if (issue.status !== "Resolved") {
      throw new Error("Only resolved issues can receive payouts.");
    }

    issue.isPaid = true;
    const saved = await this.issueRepo.update(issue);

    const now = new Date().toISOString();
    
    // Create payment record
    await this.paymentRepo.create({
      id: `pay-${crypto.randomUUID()}`,
      issueId: saved.id,
      contractorId: saved.assignedContractorId!,
      contractorName: saved.assignedContractorName!,
      amount: saved.priceQuote || 0,
      method: "Cash",
      status: "Pending",
      authorizedById: "system", // Admin ID isn't directly passed here right now, we could pass it or rely on router
      authorizedByName: "Admin",
      createdAt: now,
      dueByDays: 14,
      resolutionDate: now
    });

    // Record timeline payment event
    await this.timelineRepo.create({
      id: crypto.randomUUID(),
      issueId: saved.id,
      title: "Payment Initiated",
      description: `Payment of $${saved.priceQuote || 0} initiated. Awaiting official authorization.`,
      createdAt: now,
      isSystem: true,
    });

    if (issue.assignedContractorId) {
      // Notify contractor
      await this.createNotification(
        issue.assignedContractorId,
        "Payout Released",
        `Payout of $${issue.priceQuote || 0} for resolving "${issue.title}" was authorized.`,
        saved.id
      );
    }

    return saved;
  }

  async reopenIssue(id: string, reopenerId: string, reason: string): Promise<Issue> {
    const issue = await this.issueRepo.findById(id);
    if (!issue) {
      throw new Error("Issue not found.");
    }
    if (issue.status !== "Resolved") {
      throw new Error("Only resolved issues can be reopened.");
    }

    const reopener = await this.userRepo.findById(reopenerId);
    const reopenerName = reopener ? reopener.name : "Anonymous Resident";

    issue.status = "Reported";
    issue.assignedContractorId = undefined;
    issue.assignedContractorName = undefined;
    issue.priceQuote = undefined;
    issue.resolutionNotes = undefined;
    issue.isPaid = false;

    const saved = await this.issueRepo.update(issue);

    // Record timeline reopen event
    await this.timelineRepo.create({
      id: crypto.randomUUID(),
      issueId: saved.id,
      title: "Issue Reopened",
      description: `Issue was reopened by ${reopenerName}. Reason: "${reason}".`,
      createdAt: new Date().toISOString(),
      creatorId: reopenerId,
      creatorName: reopenerName,
      creatorRole: reopener?.role || "resident",
      isSystem: true,
    });

    // Notify followers
    await this.notifyFollowers(
      saved,
      "Issue Reopened",
      `"${issue.title}" was reopened by a resident: "${reason}".`
    );

    return saved;
  }

  async toggleFollowIssue(id: string, userId: string): Promise<Issue> {
    const issue = await this.issueRepo.findById(id);
    if (!issue) {
      throw new Error("Issue not found.");
    }

    const followers = issue.followers || [];
    const index = followers.indexOf(userId);
    if (index === -1) {
      followers.push(userId);
    } else {
      followers.splice(index, 1);
    }

    issue.followers = followers;
    return await this.issueRepo.update(issue);
  }
}

function idToUse(id: string): string {
  return id;
}
