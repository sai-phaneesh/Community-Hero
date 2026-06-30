export interface User {
  id: string;
  email: string;
  role: "resident" | "contractor" | "admin";
  name: string;
  phone: string;
  houseNumber?: string;
  specialty?: string;
  points: number;
  badges: string[];
  avatarUrl?: string;
  username: string;
  residenceType?: "owner" | "renter";
  residenceStartDate?: string;
  tenancyHistory: { residenceType: "owner" | "renter"; changedAt: string }[];
  lastLoggedIn?: string;
  activeSessions?: { sessionId: string; deviceName: string; lastUsedAt: string }[];
  capabilities?: string[];
  latitude?: number;
  longitude?: number;
}

export interface CapabilityGroup {
  id: string;
  name: string;
  description?: string;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  imageUrls: string[];
  groupId: string;
}

export interface Issue {
  id: string;
  displayId?: string;
  title: string;
  description: string;
  category: string;
  capabilityId?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  wasteCaused: string;
  status: "Reported" | "Validated" | "Assigned" | "In Progress" | "Resolved";
  reporterId: string;
  reporterName: string;
  reporterHouse: string;
  upvotes: string[];
  createdAt: string;
  daysUnattended: number;
  assignedContractorId?: string;
  assignedContractorName?: string;
  resolutionNotes?: string;
  priceQuote?: number;
  isPaid?: boolean;
  beforeImages: string[];
  beforeVideos: string[];
  afterImages: string[];
  afterVideos: string[];
  latitude: number;
  longitude: number;
  followers: string[];
  duplicateOfIssueId?: string;
  isReviewed?: boolean;
}

export interface Survey {
  id: string;
  month: string;
  residentId: string;
  residentName: string;
  overallHappiness: number;
  localServicesRating: number;
  roadQualityRating: number;
  cleanlinessRating: number;
  feedbackText: string;
  date: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  targetIssueId?: string;
  targetType?: "issue" | "bid" | "payment" | "announcement";
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  category: "Cleaning" | "Planting" | "Safety" | "Social" | "Other";
  creatorId: string;
  creatorName: string;
  location: string;
  date: string;
  createdAt: string;
  attendees: string[];
  maxAttendees?: number;
  status: "Upcoming" | "Active" | "Completed" | "Cancelled";
}

export interface Bid {
  id: string;
  issueId: string;
  contractorId: string;
  contractorName: string;
  materialsCost: number;
  laborCost: number;
  estimatedHours: number;
  proposalNotes: string;
  status: "Pending" | "Accepted" | "Rejected" | "Countered";
  counterAmount?: number;
  counterStatus?: "Pending" | "Accepted" | "Rejected";
  createdAt: string;
}

export interface BidComment {
  id: string;
  bidId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  comment: string;
  createdAt: string;
}

export interface IssueTimelineEvent {
  id: string;
  issueId: string;
  title: string;
  description: string;
  createdAt: string;
  creatorId?: string;
  creatorName?: string;
  creatorRole?: string;
  isSystem: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  category: "Water Cut" | "Electricity Outage" | "Garbage Collection" | "Water Outlet" | "Other";
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  affectedAreas?: string[];
  createdAt: string;
  creatorId: string;
}

export interface IssueChatMessage {
  id: string;
  issueId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  issueId: string;
  contractorId: string;
  contractorName: string;
  amount: number;
  method: "Cash" | "UPI" | "Bank Transfer" | "Cheque" | "Other";
  status: "Pending" | "Processing" | "Paid" | "Overdue";
  proofUrl?: string;
  notes?: string;
  authorizedById: string;
  authorizedByName: string;
  createdAt: string;
  paidAt?: string;
  dueByDays: number;
  resolutionDate: string;
}

export interface Review {
  id: string;
  issueId: string;
  contractorId: string;
  reporterId: string;
  reporterName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}
