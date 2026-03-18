export interface User {
  userId: number;
  fullName: string;
  email: string;
  role: 'Admin' | 'Consultant';
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
  createdAt: string;
}

export interface CandidateDetail extends CandidateListItem {
  resumeUrl?: string;
  skills?: string;
  notes?: string;
  department?: string;
  managerName?: string;
  jobPositionId: number;
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
