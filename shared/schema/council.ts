export interface Council {
  id: string; // CP-COU-XXXX
  name: string;
  description: string;
  city: string;
  country: string;
  imageUrl?: string;
  memberCount: number;
  adminIds: string[];
  memberIds: string[];
  verified: boolean;
  tags?: string[];
  website?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CouncilClaim {
  id: string;
  userId: string;
  type: 'membership' | 'admin' | 'event' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
