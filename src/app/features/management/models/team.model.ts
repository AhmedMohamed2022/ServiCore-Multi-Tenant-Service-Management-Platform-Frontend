export interface TeamDto {
  id: string;
  name: string;
  isActive: boolean;
}

export interface TeamMemberDto {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export interface CreateTeamRequest {
  name: string;
}

export interface UpdateTeamRequest {
  name: string;
}

export interface AddTeamMemberRequest {
  userId: string;
}
