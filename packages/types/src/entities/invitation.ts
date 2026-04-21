/**
 * Invitation Entity Types
 */

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  role: 'admin' | 'user';
  status: InvitationStatus;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface InvitationCreateInput {
  email: string;
  role: 'admin' | 'user';
}

export interface InvitationWithOrg extends Invitation {
  organization: {
    id: string;
    name: string;
    logo_url?: string;
  };
  invited_by_user: {
    id: string;
    full_name: string;
  };
}
