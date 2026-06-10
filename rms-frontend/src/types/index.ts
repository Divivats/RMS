export interface User {
  userId: number;
  fullName: string;
  email: string;
  role: 'Admin' | 'Consultant' | 'ProjectManager' | 'MD';
  token: string;
}

export interface JobPosition {
  id: number;
  jobId: string;
  title: string;
  department: string;
  location?: string;
  managerName: string;
  numberOfPositions: number;
  interviewStepCount: number;
  description?: string;
  requirements?: string;
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  status: string;
  approvalStatus: string;
  approvalComments?: string;
  approvedByMDName?: string;
  approvedByMDAt?: string;
  approvedByAdminName?: string;
  approvedByAdminAt?: string;
  createdByName?: string;
  totalCandidates: number;
  hiredCandidates: number;
  activeCandidates: number;
  createdAt: string;
  interviewSteps?: InterviewStep[];
  candidates?: CandidateListItem[];
}

export interface InterviewStep {
  stepNumber: number;
  stepName: string;
  description?: string;
}

export interface CandidateListItem {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  currentCompany?: string;
  currentPosition?: string;
  experienceYears?: number;
  alphaCoderScore?: number;
  status: string;
  currentStepNumber: number;
  totalSteps: number;
  jobTitle?: string;
  jobId?: string;
  atsScore?: number;
  createdAt: string;
}

export interface CandidateDetail extends CandidateListItem {
  resumeUrl?: string;
  skills?: string;
  notes?: string;
  department?: string;
  managerName?: string;
  jobPositionId: number;
  // Education
  education10thSchool?: string;
  education10thPercentage?: number;
  education12thSchool?: string;
  education12thPercentage?: number;
  educationCollegeName?: string;
  educationCollegeDegree?: string;
  educationCollegeCGPA?: number;
  // ATS
  atsDeterministicScore?: number;
  atsAiScore?: number;
  atsScoreDetails?: string;
  atsStatus?: string;
  interviews: CandidateInterview[];
}

export interface CandidateInterview {
  id: number;
  stepNumber: number;
  stepName: string;
  stepDescription?: string;
  status: string;
  interviewDate?: string;
  interviewerName?: string;
  overallRating?: number;
  comments?: string;
  conductedByName?: string;
  completedAt?: string;
  evaluations: Evaluation[];
}

export interface Evaluation {
  id: number;
  questionId: number;
  questionText: string;
  category: string;
  rating: number;
  remarks?: string;
}

export interface EvaluationQuestion {
  id: number;
  questionText: string;
  category: string;
  sortOrder: number;
}

export interface DashboardStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  hiredCandidates: number;
  activeCandidates: number;
  rejectedCandidates: number;
  hiringRate: number;
  // PM/MD specific
  pendingApproval?: number;
  approvedJobs?: number;
  rejectedJobs?: number;
}

export interface RecentActivity {
  candidateName: string;
  candidatePhoto?: string;
  jobTitle: string;
  action: string;
  status: string;
  timestamp: string;
}

export interface PipelineStage {
  stageName: string;
  count: number;
}

// ── Notification Types ──

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  isRead: boolean;
  createdAt: string;
}

// ── Onboarding Types ──

export interface OnboardingListItem {
  id: number;
  candidateId: number;
  fullName: string;
  photoUrl?: string;
  email?: string;
  type: 'Employee' | 'Intern';
  ghrId?: string;
  department?: string;
  designation?: string;
  dateOfJoining: string;
  evaluationMonths: number;
  completedMilestones: number;
  status: string;
  createdAt: string;
}

export interface OnboardingDetail extends OnboardingListItem {
  phone?: string;
  knoxId?: string;
  projectLead?: string;
  projectManager?: string;
  skills?: string;
  experienceYears?: number;
  currentCompany?: string;
  education10thSchool?: string;
  education10thPercentage?: number;
  education12thSchool?: string;
  education12thPercentage?: number;
  educationCollegeName?: string;
  educationCollegeDegree?: string;
  educationCollegeCGPA?: number;
  milestones: Milestone[];
}

export interface Milestone {
  id: number;
  monthNumber: number;
  buddyReportUrl?: string;
  oneToOneReportUrl?: string;
  midTermReportUrl?: string;
  performanceRating?: number;
  performanceRemarks?: string;
  status: string;
  unlocksAt: string;
  isUnlocked: boolean;
  isMidTermMonth: boolean;
  completedAt?: string;
}

export interface OnboardingStats {
  totalEmployees: number;
  activeEmployees: number;
  totalInterns: number;
  activeInterns: number;
  completed: number;
  total: number;
}
