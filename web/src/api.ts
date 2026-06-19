export type User = {
  username: string;
  full_name?: string;
  email?: string;
  role: string;
  active?: boolean;
  must_change_password?: boolean;
};

export type VideoRecord = {
  username?: string;
  patient_username?: string;
  full_name?: string;
  subject_code?: string;
  video_name?: string;
  original_filename?: string;
  stored_filename?: string;
  video_path?: string;
  processed_path?: string | null;
  exercise?: string;
  status?: string;
  time?: string;
  accuracy?: number;
  metrics?: Record<string, unknown>;
};

export type PatientRecord = User & {
  subject_code?: string;
  assigned_doctor_username?: string;
  assigned_patient_usernames?: string[];
  team_usernames?: string[];
};

export type EvaluationRecord = {
  id?: string;
  patient_username?: string;
  video_name?: string;
  exercise?: string;
  doctor_username?: string;
  doctor_name?: string;
  doctor_result?: string;
  errors?: string[];
  comments?: string;
  comments_ncv?: string;
  plan?: string;
  time?: string;
};

export type SymptomRecord = {
  username?: string;
  patient_username?: string;
  full_name?: string;
  subject_code?: string;
  symptoms?: string;
  pain_score?: number;
  pain_level?: string;
  notes?: string;
  created_at?: string;
  timestamp?: string;
  time?: string;
  [key: string]: unknown;
};

export type CreateSymptomPayload = {
  full_name: string;
  patient_id: string;
  age: number;
  gender: string;
  exercise: string;
  symptoms: string;
  vas: number;
};

export type UploadVideoPayload = {
  file: File;
  full_name: string;
  exercise: string;
};

export type AnalysisJob = {
  job_id: string;
  video_path?: string;
  username?: string;
  video_name?: string;
  exercise?: string;
  status: string;
  progress: number;
  elapsed?: number;
  start_time?: number;
  heartbeat?: number;
  status_msg?: string;
  error_msg?: string;
  result?: Record<string, unknown> | null;
  job_meta?: Record<string, unknown>;
};

export type AnalysisJobStartResult = {
  started: boolean;
  reason: string;
  job: AnalysisJob;
};

export type AnalysisArtifactItem = {
  kind: string;
  label: string;
  filename: string;
  available: boolean;
  size?: number;
  download_url: string;
};

export type AnalysisArtifactsResult = {
  video: {
    stored_filename: string;
    video_name: string;
    exercise: string;
    status: string;
    accuracy?: number;
  };
  metrics: Record<string, unknown>;
  items: AnalysisArtifactItem[];
  count: number;
};

export type CreateEvaluationPayload = {
  patient_username: string;
  video_name: string;
  exercise: string;
  doctor_result: string;
  errors: string[];
  comments: string;
  comments_ncv: string;
  plan: string;
};

export type ScheduleRecord = {
  id?: string;
  username?: string;
  patient_username?: string;
  patient_name?: string;
  full_name?: string;
  subject_code?: string;
  title?: string;
  type?: string;
  datetime?: string;
  date?: string;
  time?: string;
  status?: string;
  notes?: string;
  exercise_name?: string;
  frequency?: string;
  medication_name?: string;
  dosage?: string;
  [key: string]: unknown;
};

export type ResearchRecord = {
  id?: string;
  username?: string;
  patient_username?: string;
  full_name?: string;
  subject_code?: string;
  video_name?: string;
  exercise?: string;
  general_result?: string;
  doctor_result?: string;
  result?: string;
  created_at?: string;
  timestamp?: string;
  time?: string;
  [key: string]: unknown;
};

export type CreateSchedulePayload = {
  patient_username: string;
  type: string;
  title?: string;
  datetime?: string;
  notes?: string;
  exercise_name?: string;
  frequency?: string;
  medication_name?: string;
  dosage?: string;
};

export type CreateResearchPayload = {
  patient_username: string;
  subject_code: string;
  age: number;
  gender: string;
  diagnosis: string;
  exercise: string;
  general_result: string;
  plan: string;
  specialist_comment: string;
  recording_device: string;
  recording_angle: string;
};

export type LoginResult = {
  access_token: string;
  token_type: 'bearer';
  user: User;
};

export type RegisterPayload = {
  username: string;
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
};

export type ChangePasswordPayload = {
  old_password: string;
  new_password: string;
  confirm_password: string;
};

export type CreateUserPayload = {
  username: string;
  full_name: string;
  email: string;
  password: string;
  role: string;
  assigned_patient_usernames?: string[];
};

export type ListResult<T> = {
  items: T[];
  count: number;
};

const API_BASE_URL = (import.meta.env.VITE_REHAB_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    let message = 'Backend API error';
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail || message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

async function multipartRequest<T>(path: string, formData: FormData, token?: string): Promise<T> {
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!response.ok) {
    let message = 'Backend API error';
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail || message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

async function blobRequest(path: string, token?: string): Promise<Blob> {
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
  });
  if (!response.ok) {
    let message = 'Backend API error';
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail || message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }
  return response.blob();
}

export const api = {
  baseUrl: API_BASE_URL,
  health: () => request<{ status: string }>('/health'),
  login: (username: string, password: string) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (payload: RegisterPayload) =>
    request<LoginResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: (token: string) => request<{ user: User }>('/auth/me', {}, token),
  changePassword: (token: string, payload: ChangePasswordPayload) =>
    request<{ user: User }>(
      '/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  logout: (token: string) => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }, token),
  adminUsers: (token: string) => request<ListResult<PatientRecord>>('/admin/users', {}, token),
  createUser: (token: string, payload: CreateUserPayload) =>
    request<{ item: PatientRecord }>(
      '/admin/users',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  deleteUser: (token: string, username: string) =>
    request<{ ok: boolean; username: string }>(
      `/admin/users/${encodeURIComponent(username)}`,
      {
        method: 'DELETE',
      },
      token,
    ),
  videos: (token: string) => request<ListResult<VideoRecord>>('/videos', {}, token),
  videoBlob: (token: string, storedFilename: string) =>
    blobRequest(`/videos/media/${encodeURIComponent(storedFilename)}`, token),
  startAnalysisJob: (token: string, storedFilename: string) =>
    request<AnalysisJobStartResult>(
      `/videos/${encodeURIComponent(storedFilename)}/analysis-jobs`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      token,
    ),
  latestAnalysisJob: (token: string, storedFilename: string) =>
    request<{ job: AnalysisJob | null }>(`/videos/${encodeURIComponent(storedFilename)}/analysis-jobs/latest`, {}, token),
  analysisArtifacts: (token: string, storedFilename: string) =>
    request<AnalysisArtifactsResult>(`/videos/${encodeURIComponent(storedFilename)}/analysis-artifacts`, {}, token),
  artifactBlob: (token: string, storedFilename: string, kind: string) =>
    blobRequest(`/videos/${encodeURIComponent(storedFilename)}/analysis-artifacts/${encodeURIComponent(kind)}`, token),
  uploadVideo: (token: string, payload: UploadVideoPayload) => {
    const formData = new FormData();
    formData.set('file', payload.file);
    formData.set('full_name', payload.full_name);
    formData.set('exercise', payload.exercise);
    return multipartRequest<{ item: VideoRecord }>('/videos/upload', formData, token);
  },
  evaluations: (token: string) => request<ListResult<EvaluationRecord>>('/evaluations', {}, token),
  createEvaluation: (token: string, payload: CreateEvaluationPayload) =>
    request<{ item: EvaluationRecord }>(
      '/evaluations',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  deleteEvaluation: (token: string, id: string) =>
    request<{ ok: boolean; item?: EvaluationRecord }>(
      `/evaluations/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
      token,
    ),
  patients: (token: string) => request<ListResult<PatientRecord>>('/patients', {}, token),
  symptoms: (token: string) => request<ListResult<SymptomRecord>>('/symptoms', {}, token),
  createSymptom: (token: string, payload: CreateSymptomPayload) =>
    request<{ item: SymptomRecord }>(
      '/symptoms',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  schedules: (token: string) => request<ListResult<ScheduleRecord>>('/schedules', {}, token),
  createSchedule: (token: string, payload: CreateSchedulePayload) =>
    request<{ item: ScheduleRecord }>(
      '/schedules',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  deleteSchedule: (token: string, id: string) =>
    request<{ ok: boolean; item?: ScheduleRecord }>(
      `/schedules/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
      token,
    ),
  researchRecords: (token: string) => request<ListResult<ResearchRecord>>('/research-records', {}, token),
  createResearchRecord: (token: string, payload: CreateResearchPayload) =>
    request<{ item: ResearchRecord }>(
      '/research-records',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  deleteResearchRecord: (token: string, id: string) =>
    request<{ ok: boolean; item?: ResearchRecord }>(
      `/research-records/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
      token,
    ),
};
