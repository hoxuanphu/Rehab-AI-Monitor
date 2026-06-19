import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Eye,
  EyeOff,
  FileVideo,
  FlaskConical,
  KeyRound,
  LogOut,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  api,
  ApiError,
  AnalysisArtifactsResult,
  CreateEvaluationPayload,
  CreateResearchPayload,
  CreateSchedulePayload,
  CreateSymptomPayload,
  CreateUserPayload,
  EvaluationRecord,
  PatientRecord,
  ResearchRecord,
  ScheduleRecord,
  SymptomRecord,
  AnalysisJob,
  User,
  VideoRecord,
} from './api';

type Session = {
  token: string;
  user: User;
};

type VideoPreview = {
  key: string;
  url: string;
  label: string;
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type AuthMode = 'login' | 'register';
type ViewId = 'home' | 'videos' | 'patients' | 'symptoms' | 'schedules' | 'research' | 'users';
type RecordLike = Record<string, unknown>;

const PATIENT_ROLE = 'Bệnh nhân';
const DOCTOR_ROLE = 'Bác sĩ / KTV PHCN';
const RESEARCHER_ROLE = 'Nghiên cứu viên';
const ADMIN_ROLE = 'Quản trị viên';

function canStartAnalysis(role: string) {
  return role === ADMIN_ROLE || role === RESEARCHER_ROLE;
}

function canViewSchedules(role: string) {
  return role === ADMIN_ROLE || role === DOCTOR_ROLE || role === PATIENT_ROLE;
}

function canViewResearch(role: string) {
  return role === ADMIN_ROLE || role === DOCTOR_ROLE || role === RESEARCHER_ROLE;
}

function canCreateResearch(role: string) {
  return role === ADMIN_ROLE || role === DOCTOR_ROLE;
}

function canManageClinical(role: string) {
  return role === ADMIN_ROLE || role === DOCTOR_ROLE;
}

function canManageUsers(role: string) {
  return role === ADMIN_ROLE;
}

function roleWorkspaceTitle(role: string) {
  if (role === PATIENT_ROLE) {
    return 'Không gian tập luyện của bệnh nhân';
  }
  if (role === DOCTOR_ROLE) {
    return 'Bàn làm việc bác sĩ / KTV PHCN';
  }
  if (role === RESEARCHER_ROLE) {
    return 'Không gian phân tích nghiên cứu';
  }
  if (role === ADMIN_ROLE) {
    return 'Bảng điều hành quản trị';
  }
  return 'Workspace phục hồi chức năng';
}

function roleWorkspaceEyebrow(role: string) {
  if (role === PATIENT_ROLE) {
    return 'Bệnh nhân';
  }
  if (role === DOCTOR_ROLE) {
    return 'Lâm sàng';
  }
  if (role === RESEARCHER_ROLE) {
    return 'Nghiên cứu';
  }
  if (role === ADMIN_ROLE) {
    return 'Quản trị';
  }
  return 'Dashboard dữ liệu';
}

function viewLabelForRole(view: ViewId, role: string) {
  const labels: Record<ViewId, string> = {
    home: 'Trang chủ',
    videos: role === PATIENT_ROLE ? 'Video tập luyện' : role === RESEARCHER_ROLE ? 'Hàng đợi AI' : 'Video bệnh nhân',
    patients: role === PATIENT_ROLE ? 'Hồ sơ của tôi' : 'Bệnh nhân',
    symptoms: role === PATIENT_ROLE ? 'Khai báo đau' : 'Triệu chứng',
    schedules: role === PATIENT_ROLE ? 'Lịch của tôi' : 'Lịch nhắc',
    research: role === RESEARCHER_ROLE ? 'Dữ liệu NCKH' : 'Phiếu nghiên cứu',
    users: 'Người dùng',
  };
  return labels[view];
}

function textValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Có' : 'Không';
    }
  }
  return 'N/A';
}

function patientLabel(record: RecordLike) {
  return textValue(record.full_name, record.subject_code, record.username, record.patient_username);
}

function pathBasename(value: unknown) {
  return String(value || '')
    .split(/[\\/]/)
    .filter(Boolean)
    .pop();
}

function mediaFilenameForVideo(video: VideoRecord) {
  return video.stored_filename || pathBasename(video.video_path) || pathBasename(video.processed_path) || pathBasename(video.video_name) || '';
}

function videoKey(video: VideoRecord, index: number) {
  return `${video.username || video.patient_username || 'video'}|${mediaFilenameForVideo(video) || index}|${video.exercise || ''}`;
}

function recordKey(prefix: string, record: RecordLike, index: number) {
  return `${prefix}|${textValue(record.username, record.patient_username, record.subject_code, index)}|${textValue(
    record.video_name,
    record.title,
    record.created_at,
    record.timestamp,
    record.time,
    index,
  )}`;
}

function matchingEvaluation(video: VideoRecord, evaluations: EvaluationRecord[]) {
  const username = video.username || video.patient_username;
  return evaluations.find((item) => {
    return (
      item.patient_username === username &&
      (!video.exercise || item.exercise === video.exercise) &&
      (!video.video_name || item.video_name === video.video_name)
    );
  });
}

function flattenValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenValues);
  }
  if (typeof value === 'object') {
    return Object.values(value as RecordLike).flatMap(flattenValues);
  }
  return [String(value)];
}

function matchesQuery(record: RecordLike, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) {
    return true;
  }
  return flattenValues(record).join(' ').toLowerCase().includes(text);
}

function statusClass(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text.includes('hoàn') || text.includes('ok') || text.includes('done') || text.includes('đã')) {
    return 'success';
  }
  if (text.includes('lỗi') || text.includes('fail') || text.includes('hủy')) {
    return 'danger';
  }
  return 'neutral';
}

function countLabel(count: number) {
  return count > 999 ? '999+' : String(count);
}

function analysisStatusLabel(status: unknown) {
  const text = String(status || '');
  if (text === 'ready_for_ai_worker') {
    return 'Sẵn sàng AI';
  }
  if (text === 'processing') {
    return 'Đang xử lý';
  }
  if (text === 'success') {
    return 'Hoàn tất';
  }
  if (text === 'error') {
    return 'Lỗi';
  }
  return text || 'Chưa chạy';
}

function fileSizeLabel(size: unknown) {
  const value = typeof size === 'number' ? size : Number(size || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return 'N/A';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function metricLabel(key: string) {
  const labels: Record<string, string> = {
    do_chinh_xac: 'Độ chính xác',
    f1_score: 'F1-score',
    mae_tong: 'MAE',
    icc: 'ICC',
    recall: 'Recall',
    precision: 'Precision',
    tb_goc_vai: 'Góc vai TB',
    tb_goc_khuyu: 'Góc khuỷu TB',
  };
  return labels[key] || key;
}

type TableColumn<T extends RecordLike> = {
  key: string;
  label: string;
  render: (item: T, index: number) => React.ReactNode;
};

function DataTable<T extends RecordLike>({
  columns,
  items,
  emptyText,
  rowKey,
}: {
  columns: TableColumn<T>[];
  items: T[];
  emptyText: string;
  rowKey: (item: T, index: number) => string;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={rowKey(item, index)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(item, index)}</td>
              ))}
            </tr>
          ))}
          {!items.length ? (
            <tr>
              <td colSpan={columns.length} className="empty-cell">
                {emptyText}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const token = window.localStorage.getItem('rehab_token');
    const userRaw = window.localStorage.getItem('rehab_user');
    if (!token || !userRaw) {
      return null;
    }
    try {
      return { token, user: JSON.parse(userRaw) as User };
    } catch {
      window.localStorage.removeItem('rehab_token');
      window.localStorage.removeItem('rehab_user');
      return null;
    }
  });
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [activeView, setActiveView] = useState<ViewId>('home');
  const [health, setHealth] = useState<LoadState>('idle');
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [users, setUsers] = useState<PatientRecord[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [researchRecords, setResearchRecords] = useState<ResearchRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [formState, setFormState] = useState<LoadState>('idle');
  const [previewState, setPreviewState] = useState<LoadState>('idle');
  const [previewTargetKey, setPreviewTargetKey] = useState('');
  const [analysisJobs, setAnalysisJobs] = useState<Record<string, AnalysisJob | null>>({});
  const [analysisState, setAnalysisState] = useState<LoadState>('idle');
  const [analysisTargetKey, setAnalysisTargetKey] = useState('');
  const [artifactState, setArtifactState] = useState<LoadState>('idle');
  const [artifactTargetKey, setArtifactTargetKey] = useState('');
  const [artifactMessage, setArtifactMessage] = useState('');
  const [analysisArtifacts, setAnalysisArtifacts] = useState<AnalysisArtifactsResult | null>(null);
  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null);
  const [message, setMessage] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [previewMessage, setPreviewMessage] = useState('');
  const [analysisMessage, setAnalysisMessage] = useState('');
  const previewUrlRef = useRef<string | null>(null);
  const completedAnalysisRefreshRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    api
      .health()
      .then(() => active && setHealth('ready'))
      .catch(() => active && setHealth('error'));
    return () => {
      active = false;
    };
  }, []);

  function clearLocalSession(nextMessage = '') {
    window.localStorage.removeItem('rehab_token');
    window.localStorage.removeItem('rehab_user');
    clearVideoPreview();
    setSession(null);
    setVideos([]);
    setEvaluations([]);
    setPatients([]);
    setUsers([]);
    setSymptoms([]);
    setSchedules([]);
    setResearchRecords([]);
    setAnalysisJobs({});
    setAnalysisState('idle');
    setAnalysisTargetKey('');
    setAnalysisMessage('');
    setArtifactState('idle');
    setArtifactTargetKey('');
    setArtifactMessage('');
    setAnalysisArtifacts(null);
    completedAnalysisRefreshRef.current.clear();
    setMessage(nextMessage);
  }

  async function loadDashboard(nextSession = session) {
    if (!nextSession) {
      return;
    }
    setLoadState('loading');
    setMessage('');
    const role = nextSession.user.role;
    try {
      const [videoResult, evaluationResult, patientResult, symptomResult, scheduleResult, researchResult, userResult] = await Promise.all([
        api.videos(nextSession.token),
        api.evaluations(nextSession.token),
        api.patients(nextSession.token),
        api.symptoms(nextSession.token),
        canViewSchedules(role) ? api.schedules(nextSession.token) : Promise.resolve({ items: [], count: 0 }),
        canViewResearch(role) ? api.researchRecords(nextSession.token) : Promise.resolve({ items: [], count: 0 }),
        canManageUsers(role) ? api.adminUsers(nextSession.token) : Promise.resolve({ items: [], count: 0 }),
      ]);
      setVideos(videoResult.items);
      setEvaluations(evaluationResult.items);
      setPatients(patientResult.items);
      setUsers(userResult.items);
      setSymptoms(symptomResult.items);
      setSchedules(scheduleResult.items);
      setResearchRecords(researchResult.items);
      setPreviewMessage('');
      setAnalysisMessage('');
      setLoadState('ready');
    } catch (error) {
      setLoadState('error');
      if (error instanceof ApiError && error.status === 401) {
        clearLocalSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      setMessage(error instanceof Error ? error.message : 'Không tải được dữ liệu.');
    }
  }

  async function handleCreateSymptom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: CreateSymptomPayload = {
      full_name: String(formData.get('full_name') || session.user.full_name || session.user.username),
      patient_id: String(formData.get('patient_id') || session.user.username),
      age: Number(formData.get('age') || 0),
      gender: String(formData.get('gender') || ''),
      exercise: String(formData.get('exercise') || ''),
      symptoms: String(formData.get('symptoms') || ''),
      vas: Number(formData.get('vas') || 0),
    };
    setFormState('loading');
    setFormMessage('');
    try {
      await api.createSymptom(session.token, payload);
      form.reset();
      setFormState('ready');
      setFormMessage('Đã gửi khai báo triệu chứng.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      if (error instanceof ApiError && error.status === 401) {
        clearLocalSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      setFormMessage(error instanceof Error ? error.message : 'Không gửi được khai báo triệu chứng.');
    }
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('file');
    const exercise = String(formData.get('exercise') || '');
    if (!(file instanceof File) || !file.name) {
      setFormState('error');
      setFormMessage('Vui lòng chọn file video.');
      return;
    }
    setFormState('loading');
    setFormMessage('');
    try {
      await api.uploadVideo(session.token, {
        file,
        full_name: String(formData.get('full_name') || session.user.full_name || session.user.username),
        exercise,
      });
      form.reset();
      setFormState('ready');
      setFormMessage('Đã gửi video cho bác sĩ và nghiên cứu viên.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      if (error instanceof ApiError && error.status === 401) {
        clearLocalSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      setFormMessage(error instanceof Error ? error.message : 'Không upload được video.');
    }
  }

  async function handleCreateEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedVideoKey = String(formData.get('video_key') || '');
    const selectedVideo = videos.find((video, index) => videoKey(video, index) === selectedVideoKey);
    if (!selectedVideo) {
      setFormState('error');
      setFormMessage('Vui lòng chọn video cần đánh giá.');
      return;
    }
    const payload: CreateEvaluationPayload = {
      patient_username: textValue(selectedVideo.username, selectedVideo.patient_username),
      video_name: textValue(selectedVideo.video_name, selectedVideo.original_filename),
      exercise: textValue(selectedVideo.exercise),
      doctor_result: String(formData.get('doctor_result') || ''),
      errors: formData.getAll('errors').map(String),
      comments: String(formData.get('comments') || ''),
      comments_ncv: String(formData.get('comments_ncv') || ''),
      plan: String(formData.get('plan') || 'Tiếp tục'),
    };
    setFormState('loading');
    setFormMessage('');
    try {
      await api.createEvaluation(session.token, payload);
      form.reset();
      setFormState('ready');
      setFormMessage('Đã lưu đánh giá lâm sàng.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      if (error instanceof ApiError && error.status === 401) {
        clearLocalSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      setFormMessage(error instanceof Error ? error.message : 'Không lưu được đánh giá.');
    }
  }

  async function handleDeleteEvaluation(record: EvaluationRecord) {
    if (!session || !record.id) {
      return;
    }
    setFormState('loading');
    setFormMessage('');
    try {
      await api.deleteEvaluation(session.token, record.id);
      setFormState('ready');
      setFormMessage('Đã xóa đánh giá.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      setFormMessage(error instanceof Error ? error.message : 'Không xóa được đánh giá.');
    }
  }

  async function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const type = String(formData.get('type') || 'appointment');
    const payload: CreateSchedulePayload = {
      patient_username: String(formData.get('patient_username') || ''),
      type,
      title: String(formData.get('title') || ''),
      datetime: String(formData.get('datetime') || ''),
      notes: String(formData.get('notes') || ''),
      exercise_name: String(formData.get('exercise_name') || ''),
      frequency: String(formData.get('frequency') || ''),
      medication_name: String(formData.get('medication_name') || ''),
      dosage: String(formData.get('dosage') || ''),
    };
    setFormState('loading');
    setFormMessage('');
    try {
      await api.createSchedule(session.token, payload);
      form.reset();
      setFormState('ready');
      setFormMessage('Đã thêm lịch nhắc.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      setFormMessage(error instanceof Error ? error.message : 'Không thêm được lịch nhắc.');
    }
  }

  async function handleDeleteSchedule(record: ScheduleRecord) {
    if (!session || !record.id) {
      return;
    }
    setFormState('loading');
    setFormMessage('');
    try {
      await api.deleteSchedule(session.token, record.id);
      setFormState('ready');
      setFormMessage('Đã xóa lịch nhắc.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      setFormMessage(error instanceof Error ? error.message : 'Không xóa được lịch nhắc.');
    }
  }

  async function handleCreateResearchRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: CreateResearchPayload = {
      patient_username: String(formData.get('patient_username') || ''),
      subject_code: String(formData.get('subject_code') || ''),
      age: Number(formData.get('age') || 0),
      gender: String(formData.get('gender') || ''),
      diagnosis: String(formData.get('diagnosis') || ''),
      exercise: String(formData.get('exercise') || ''),
      general_result: String(formData.get('general_result') || ''),
      plan: String(formData.get('plan') || ''),
      specialist_comment: String(formData.get('specialist_comment') || ''),
      recording_device: String(formData.get('recording_device') || ''),
      recording_angle: String(formData.get('recording_angle') || ''),
    };
    setFormState('loading');
    setFormMessage('');
    try {
      await api.createResearchRecord(session.token, payload);
      form.reset();
      setFormState('ready');
      setFormMessage('Đã lưu phiếu nghiên cứu.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      setFormMessage(error instanceof Error ? error.message : 'Không lưu được phiếu nghiên cứu.');
    }
  }

  async function handleDeleteResearchRecord(record: ResearchRecord) {
    if (!session || !record.id) {
      return;
    }
    setFormState('loading');
    setFormMessage('');
    try {
      await api.deleteResearchRecord(session.token, record.id);
      setFormState('ready');
      setFormMessage('Đã xóa phiếu nghiên cứu.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      setFormMessage(error instanceof Error ? error.message : 'Không xóa được phiếu nghiên cứu.');
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const assignedText = String(formData.get('assigned_patient_usernames') || '');
    const payload: CreateUserPayload = {
      username: String(formData.get('username') || ''),
      full_name: String(formData.get('full_name') || ''),
      email: String(formData.get('email') || ''),
      password: String(formData.get('password') || ''),
      role: String(formData.get('role') || PATIENT_ROLE),
      assigned_patient_usernames: assignedText.split(',').map((item) => item.trim()).filter(Boolean),
    };
    setFormState('loading');
    setFormMessage('');
    try {
      await api.createUser(session.token, payload);
      form.reset();
      setFormState('ready');
      setFormMessage('Đã tạo tài khoản.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      setFormMessage(error instanceof Error ? error.message : 'Không tạo được tài khoản.');
    }
  }

  async function handleDeleteUser(record: PatientRecord) {
    if (!session || !record.username) {
      return;
    }
    setFormState('loading');
    setFormMessage('');
    try {
      await api.deleteUser(session.token, record.username);
      setFormState('ready');
      setFormMessage('Đã xóa tài khoản.');
      await loadDashboard(session);
    } catch (error) {
      setFormState('error');
      setFormMessage(error instanceof Error ? error.message : 'Không xóa được tài khoản.');
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    setFormState('loading');
    setFormMessage('');
    try {
      const result = await api.changePassword(session.token, {
        old_password: String(formData.get('old_password') || ''),
        new_password: String(formData.get('new_password') || ''),
        confirm_password: String(formData.get('confirm_password') || ''),
      });
      const nextSession = { ...session, user: result.user };
      window.localStorage.setItem('rehab_user', JSON.stringify(result.user));
      setSession(nextSession);
      form.reset();
      setFormState('ready');
      setFormMessage('Đã đổi mật khẩu.');
    } catch (error) {
      setFormState('error');
      setFormMessage(error instanceof Error ? error.message : 'Không đổi được mật khẩu.');
    }
  }

  function clearVideoPreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setVideoPreview(null);
    setPreviewState('idle');
    setPreviewTargetKey('');
  }

  async function handlePreviewVideo(video: VideoRecord, index: number) {
    if (!session) {
      return;
    }
    const key = videoKey(video, index);
    if (videoPreview?.key === key) {
      clearVideoPreview();
      setPreviewMessage('');
      return;
    }
    const mediaFilename = mediaFilenameForVideo(video);
    if (!mediaFilename) {
      setPreviewState('error');
      setPreviewMessage('Video này chưa có file media để xem.');
      return;
    }
    setPreviewMessage('');
    clearVideoPreview();
    setPreviewState('loading');
    setPreviewTargetKey(key);
    try {
      const blob = await api.videoBlob(session.token, mediaFilename);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setVideoPreview({
        key,
        url,
        label: textValue(video.video_name, video.original_filename, mediaFilename),
      });
      setPreviewState('ready');
    } catch (error) {
      setPreviewState('error');
      if (error instanceof ApiError && error.status === 401) {
        clearLocalSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      setPreviewMessage(error instanceof Error ? error.message : 'Không tải được video.');
    }
  }

  async function refreshAnalysisJob(video: VideoRecord, index: number, nextSession = session) {
    if (!nextSession) {
      return;
    }
    const mediaFilename = mediaFilenameForVideo(video);
    if (!mediaFilename) {
      return;
    }
    const key = videoKey(video, index);
    const result = await api.latestAnalysisJob(nextSession.token, mediaFilename);
    setAnalysisJobs((current) => ({ ...current, [key]: result.job }));
    if (result.job?.status === 'success' && !completedAnalysisRefreshRef.current.has(result.job.job_id)) {
      completedAnalysisRefreshRef.current.add(result.job.job_id);
      await loadDashboard(nextSession);
    }
  }

  async function handleStartAnalysis(video: VideoRecord, index: number) {
    if (!session) {
      return;
    }
    const mediaFilename = mediaFilenameForVideo(video);
    if (!mediaFilename) {
      setAnalysisState('error');
      setAnalysisMessage('Video này chưa có file media để phân tích.');
      return;
    }
    const key = videoKey(video, index);
    setAnalysisState('loading');
    setAnalysisTargetKey(key);
    setAnalysisMessage('');
    try {
      const result = await api.startAnalysisJob(session.token, mediaFilename);
      if (result.job?.job_id) {
        completedAnalysisRefreshRef.current.delete(result.job.job_id);
      }
      setAnalysisJobs((current) => ({ ...current, [key]: result.job }));
      setAnalysisState('ready');
      setAnalysisMessage(result.started ? 'Đã tạo job phân tích.' : 'Job phân tích đang chạy.');
    } catch (error) {
      setAnalysisState('error');
      if (error instanceof ApiError && error.status === 401) {
        clearLocalSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      setAnalysisMessage(error instanceof Error ? error.message : 'Không tạo được job phân tích.');
    }
  }

  async function handleRefreshAnalysis(video: VideoRecord, index: number) {
    if (!session) {
      return;
    }
    const key = videoKey(video, index);
    setAnalysisState('loading');
    setAnalysisTargetKey(key);
    setAnalysisMessage('');
    try {
      await refreshAnalysisJob(video, index, session);
      setAnalysisState('ready');
    } catch (error) {
      setAnalysisState('error');
      if (error instanceof ApiError && error.status === 401) {
        clearLocalSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      setAnalysisMessage(error instanceof Error ? error.message : 'Không tải được tiến độ phân tích.');
    }
  }

  async function handleLoadArtifacts(video: VideoRecord, index: number) {
    if (!session) {
      return;
    }
    const mediaFilename = mediaFilenameForVideo(video);
    if (!mediaFilename) {
      setArtifactState('error');
      setArtifactMessage('Video này chưa có file media để tra cứu kết quả.');
      return;
    }
    const key = videoKey(video, index);
    setArtifactState('loading');
    setArtifactTargetKey(key);
    setArtifactMessage('');
    try {
      const result = await api.analysisArtifacts(session.token, mediaFilename);
      setAnalysisArtifacts(result);
      setArtifactState('ready');
      setArtifactMessage('');
    } catch (error) {
      setArtifactState('error');
      if (error instanceof ApiError && error.status === 401) {
        clearLocalSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      setArtifactMessage(error instanceof Error ? error.message : 'Không tải được danh sách kết quả phân tích.');
    }
  }

  async function handleDownloadArtifact(kind: string, filename: string) {
    if (!session || !analysisArtifacts?.video.stored_filename) {
      return;
    }
    setArtifactState('loading');
    setArtifactMessage('');
    try {
      const blob = await api.artifactBlob(session.token, analysisArtifacts.video.stored_filename, kind);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${kind}.dat`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setArtifactState('ready');
    } catch (error) {
      setArtifactState('error');
      setArtifactMessage(error instanceof Error ? error.message : 'Không tải được artifact.');
    }
  }

  useEffect(() => {
    if (session) {
      void loadDashboard(session);
    }
  }, [session?.token]);

  const filteredVideos = useMemo(() => videos.filter((video) => matchesQuery(video as RecordLike, query)), [query, videos]);
  const filteredPatients = useMemo(() => patients.filter((patient) => matchesQuery(patient as RecordLike, query)), [patients, query]);
  const filteredUsers = useMemo(() => users.filter((user) => matchesQuery(user as RecordLike, query)), [query, users]);
  const filteredSymptoms = useMemo(() => symptoms.filter((symptom) => matchesQuery(symptom, query)), [query, symptoms]);
  const filteredSchedules = useMemo(() => schedules.filter((schedule) => matchesQuery(schedule, query)), [query, schedules]);
  const filteredResearch = useMemo(
    () => researchRecords.filter((record) => matchesQuery(record, query)),
    [query, researchRecords],
  );

  useEffect(() => {
    if (!session || activeView !== 'videos' || !filteredVideos.length) {
      return;
    }
    let active = true;
    Promise.all(
      filteredVideos.slice(0, 20).map(async (video, index) => {
        const mediaFilename = mediaFilenameForVideo(video);
        if (!mediaFilename) {
          return null;
        }
        const result = await api.latestAnalysisJob(session.token, mediaFilename);
        return [videoKey(video, index), result.job] as const;
      }),
    )
      .then((entries) => {
        if (!active) {
          return;
        }
        setAnalysisJobs((current) => {
          const next = { ...current };
          for (const entry of entries) {
            if (entry) {
              next[entry[0]] = entry[1];
            }
          }
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [activeView, filteredVideos, session?.token]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const hasProcessing = Object.values(analysisJobs).some((job) => job?.status === 'processing');
    if (!hasProcessing) {
      return;
    }
    const timer = window.setInterval(() => {
      filteredVideos.forEach((video, index) => {
        const key = videoKey(video, index);
        if (analysisJobs[key]?.status === 'processing') {
          void refreshAnalysisJob(video, index, session);
        }
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [analysisJobs, filteredVideos, session?.token]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const evaluatedCount = useMemo(() => {
    return videos.filter((video) => matchingEvaluation(video, evaluations)).length;
  }, [videos, evaluations]);

  const pendingVideos = useMemo(
    () => videos.filter((video) => !String(video.status || '').includes('Đã phân tích')).length,
    [videos],
  );

  const metricCards = useMemo(() => {
    const role = session?.user.role || '';
    if (role === PATIENT_ROLE) {
      return [
        { label: 'Video của tôi', value: videos.length },
        { label: 'Đã được đánh giá', value: evaluatedCount },
        { label: 'Khai báo đau', value: symptoms.length },
        { label: 'Lịch nhắc', value: schedules.length },
      ];
    }
    if (role === DOCTOR_ROLE) {
      return [
        { label: 'Bệnh nhân phụ trách', value: patients.length },
        { label: 'Video cần xem', value: videos.length },
        { label: 'Đã đánh giá', value: evaluations.length },
        { label: 'Lịch đã tạo', value: schedules.length },
      ];
    }
    if (role === RESEARCHER_ROLE) {
      return [
        { label: 'Video nghiên cứu', value: videos.length },
        { label: 'Chờ AI', value: pendingVideos },
        { label: 'Phiếu NCKH', value: researchRecords.length },
        { label: 'Backend', value: health === 'ready' ? 'OK' : 'Lỗi' },
      ];
    }
    if (role === ADMIN_ROLE) {
      return [
        { label: 'Người dùng', value: users.length },
        { label: 'Bệnh nhân', value: patients.length },
        { label: 'Video', value: videos.length },
        { label: 'Backend', value: health === 'ready' ? 'OK' : 'Lỗi' },
      ];
    }
    return [
      { label: 'Video', value: videos.length },
      { label: 'Đã đánh giá', value: evaluatedCount },
      { label: 'Bệnh nhân', value: patients.length },
      { label: 'Backend', value: health === 'ready' ? 'OK' : 'Lỗi' },
    ];
  }, [evaluatedCount, evaluations.length, health, patients.length, pendingVideos, researchRecords.length, schedules.length, session?.user.role, symptoms.length, users.length, videos.length]);

  const workflowCards = useMemo(() => {
    const role = session?.user.role || '';
    if (role === PATIENT_ROLE) {
      return [
        { view: 'videos' as ViewId, title: 'Gửi video tập luyện', body: 'Upload bài tập mới để bác sĩ và NCV theo dõi.' },
        { view: 'symptoms' as ViewId, title: 'Khai báo đau VAS', body: 'Ghi nhận triệu chứng trước hoặc sau buổi tập.' },
        { view: 'schedules' as ViewId, title: 'Xem lịch nhắc', body: 'Theo dõi lịch hẹn, lịch tập và lịch thuốc.' },
      ];
    }
    if (role === DOCTOR_ROLE) {
      return [
        { view: 'videos' as ViewId, title: 'Đánh giá video', body: 'Ghi nhận ground truth, lỗi sai và chỉ định tiếp theo.' },
        { view: 'schedules' as ViewId, title: 'Tạo lịch nhắc', body: 'Gửi lịch hẹn, lịch tập hoặc thuốc cho bệnh nhân.' },
        { view: 'research' as ViewId, title: 'Lập phiếu nghiên cứu', body: 'Hoàn thiện dữ liệu lâm sàng phục vụ nghiên cứu.' },
      ];
    }
    if (role === RESEARCHER_ROLE) {
      return [
        { view: 'videos' as ViewId, title: 'Chạy phân tích AI', body: 'Theo dõi hàng đợi video và tiến độ xử lý.' },
        { view: 'research' as ViewId, title: 'Rà soát dữ liệu NCKH', body: 'Xem phiếu nghiên cứu ở dạng đã giả danh.' },
        { view: 'patients' as ViewId, title: 'Danh sách đối tượng', body: 'Xem danh sách bệnh nhân ở dạng mã nghiên cứu.' },
      ];
    }
    if (role === ADMIN_ROLE) {
      return [
        { view: 'users' as ViewId, title: 'Cấp tài khoản', body: 'Tạo tài khoản bác sĩ, NCV, admin hoặc bệnh nhân.' },
        { view: 'videos' as ViewId, title: 'Giám sát dữ liệu', body: 'Xem toàn bộ video, job AI và đánh giá.' },
        { view: 'research' as ViewId, title: 'Kiểm tra phiếu NCKH', body: 'Rà soát dữ liệu nghiên cứu trong hệ thống.' },
      ];
    }
    return [];
  }, [session?.user.role]);

  const availableViews = useMemo(() => {
    const role = session?.user.role || '';
    const views: Array<{ id: ViewId; label: string; icon: LucideIcon; count: number }> = [
      { id: 'home', label: viewLabelForRole('home', role), icon: Activity, count: 0 },
      { id: 'videos', label: viewLabelForRole('videos', role), icon: FileVideo, count: videos.length },
      { id: 'patients', label: viewLabelForRole('patients', role), icon: UsersRound, count: patients.length },
      { id: 'symptoms', label: viewLabelForRole('symptoms', role), icon: ClipboardList, count: symptoms.length },
    ];
    if (canViewSchedules(role)) {
      views.push({ id: 'schedules', label: viewLabelForRole('schedules', role), icon: CalendarDays, count: schedules.length });
    }
    if (canViewResearch(role)) {
      views.push({ id: 'research', label: viewLabelForRole('research', role), icon: FlaskConical, count: researchRecords.length });
    }
    if (canManageUsers(role)) {
      views.push({ id: 'users', label: 'Người dùng', icon: UserPlus, count: users.length });
    }
    return views;
  }, [evaluations.length, patients.length, researchRecords.length, schedules.length, session?.user.role, symptoms.length, users.length, videos.length]);

  useEffect(() => {
    if (!availableViews.some((view) => view.id === activeView)) {
      setActiveView(availableViews[0]?.id || 'home');
    }
  }, [activeView, availableViews]);

  const activeCount = {
    home: videos.length + patients.length + symptoms.length + schedules.length + researchRecords.length + users.length,
    videos: filteredVideos.length,
    patients: filteredPatients.length,
    symptoms: filteredSymptoms.length,
    schedules: filteredSchedules.length,
    research: filteredResearch.length,
    users: filteredUsers.length,
  }[activeView];

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get('username') || '');
    const password = String(formData.get('password') || '');
    setMessage('');
    setLoadState('loading');
    try {
      const login = await api.login(username, password);
      const nextSession = { token: login.access_token, user: login.user };
      window.localStorage.setItem('rehab_token', nextSession.token);
      window.localStorage.setItem('rehab_user', JSON.stringify(nextSession.user));
      setSession(nextSession);
      setActiveView('home');
      setLoadState('ready');
    } catch (error) {
      setLoadState('error');
      setMessage(error instanceof Error ? error.message : 'Đăng nhập thất bại.');
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      username: String(formData.get('username') || ''),
      full_name: String(formData.get('full_name') || ''),
      email: String(formData.get('email') || ''),
      password: String(formData.get('password') || ''),
      confirm_password: String(formData.get('confirm_password') || ''),
    };
    setMessage('');
    setLoadState('loading');
    try {
      const registration = await api.register(payload);
      const nextSession = { token: registration.access_token, user: registration.user };
      window.localStorage.setItem('rehab_token', nextSession.token);
      window.localStorage.setItem('rehab_user', JSON.stringify(nextSession.user));
      setSession(nextSession);
      setActiveView('home');
      setLoadState('ready');
    } catch (error) {
      setLoadState('error');
      setMessage(error instanceof Error ? error.message : 'Đăng ký thất bại.');
    }
  }

  async function handleLogout() {
    if (session) {
      try {
        await api.logout(session.token);
      } catch {
        // Local session cleanup is still the important part for this frontend slice.
      }
    }
    clearLocalSession();
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="brand-mark">
            <Activity size={28} />
          </div>
          <div>
            <p className="eyebrow">Rehab AI Monitor</p>
            <h1>{authMode === 'login' ? 'Đăng nhập hệ thống' : 'Đăng ký bệnh nhân'}</h1>
            <p className="muted">
              {authMode === 'login'
                ? 'Theo dõi video, lịch nhắc và kết quả phục hồi chức năng.'
                : 'Tạo tài khoản bệnh nhân để bắt đầu theo dõi phục hồi chức năng.'}
            </p>
          </div>
          <div className="auth-switch" role="tablist" aria-label="Chọn chế độ xác thực">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')} type="button">
              Đăng nhập
            </button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')} type="button">
              Đăng ký
            </button>
          </div>
          {authMode === 'login' ? (
            <form className="login-form" onSubmit={handleLogin}>
              <label>
                Tên đăng nhập
                <input name="username" autoComplete="username" placeholder="admin / doctor / patient" required />
              </label>
              <label>
                Mật khẩu
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <button type="submit" disabled={loadState === 'loading'}>
                {loadState === 'loading' ? <RefreshCw className="spin" size={18} /> : <Shield size={18} />}
                Đăng nhập
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleRegister}>
              <label>
                Họ và tên
                <input name="full_name" autoComplete="name" placeholder="Nguyễn Văn A" required />
              </label>
              <label>
                Tên đăng nhập
                <input name="username" autoComplete="username" placeholder="patient01" minLength={3} required />
              </label>
              <label>
                Email liên hệ
                <input name="email" type="email" autoComplete="email" placeholder="email@example.com" required />
              </label>
              <label>
                Mật khẩu
                <input name="password" type="password" autoComplete="new-password" minLength={6} required />
              </label>
              <label>
                Xác nhận mật khẩu
                <input name="confirm_password" type="password" autoComplete="new-password" minLength={6} required />
              </label>
              <button type="submit" disabled={loadState === 'loading'}>
                {loadState === 'loading' ? <RefreshCw className="spin" size={18} /> : <UserRound size={18} />}
                Tạo tài khoản
              </button>
              <p className="form-note">Tài khoản bác sĩ, nghiên cứu viên và quản trị viên do quản trị viên cấp.</p>
            </form>
          )}
          <div className={`status-line ${health === 'ready' ? 'ok' : health === 'error' ? 'bad' : ''}`}>
            {health === 'ready' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            Backend: {api.baseUrl}
          </div>
          {message ? <div className="alert">{message}</div> : null}
        </section>
      </main>
    );
  }

  const videoColumns: TableColumn<VideoRecord>[] = [
    { key: 'patient', label: 'Bệnh nhân', render: (video) => patientLabel(video as RecordLike) },
    {
      key: 'video',
      label: 'Video',
      render: (video) => (
        <span className="video-name">
          <FileVideo size={16} />
          {textValue(video.video_name)}
        </span>
      ),
    },
    { key: 'exercise', label: 'Bài tập', render: (video) => textValue(video.exercise) },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (video) => <span className={`pill ${statusClass(video.status)}`}>{textValue(video.status, 'Chờ xử lý')}</span>,
    },
    {
      key: 'evaluation',
      label: 'Đánh giá',
      render: (video) => {
        const evaluation = matchingEvaluation(video, evaluations);
        return evaluation ? textValue(evaluation.doctor_result, 'Đã đánh giá') : 'Chưa có';
      },
    },
    {
      key: 'analysis',
      label: 'Phân tích',
      render: (video, index) => {
        const key = videoKey(video, index);
        const job = analysisJobs[key];
        const progress = Math.round(Math.max(0, Math.min(1, job?.progress ?? 0)) * 100);
        const isLoading = analysisState === 'loading' && analysisTargetKey === key;
        const hasMedia = Boolean(mediaFilenameForVideo(video));
        return (
          <div className="analysis-cell">
            <div className="analysis-status">
              <span className={`pill ${statusClass(job?.status || video.status)}`}>{analysisStatusLabel(job?.status)}</span>
              <span>{job ? `${progress}%` : 'N/A'}</span>
            </div>
            <div className="progress-track" aria-label="Tiến độ phân tích">
              <span className={`progress-fill ${statusClass(job?.status)}`} style={{ width: `${job ? progress : 0}%` }} />
            </div>
            <div className="analysis-actions">
              {canStartAnalysis(session.user.role) ? (
                <button
                  className="table-action"
                  onClick={() => void handleStartAnalysis(video, index)}
                  disabled={!hasMedia || isLoading || job?.status === 'processing'}
                  title={hasMedia ? 'Bắt đầu phân tích AI' : 'Chưa có file media'}
                  type="button"
                >
                  {isLoading ? <RefreshCw className="spin" size={16} /> : <Cpu size={16} />}
                  Chạy
                </button>
              ) : null}
              <button
                className="table-action muted-action"
                onClick={() => void handleRefreshAnalysis(video, index)}
                disabled={!hasMedia || isLoading}
                title={hasMedia ? 'Cập nhật tiến độ' : 'Chưa có file media'}
                type="button"
              >
                <RefreshCw className={isLoading ? 'spin' : ''} size={16} />
                Cập nhật
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (video, index) => {
        const key = videoKey(video, index);
        const isOpen = videoPreview?.key === key;
        const isLoading = previewState === 'loading' && previewTargetKey === key;
        const artifactLoading = artifactState === 'loading' && artifactTargetKey === key;
        const hasMedia = Boolean(mediaFilenameForVideo(video));
        return (
          <div className="row-actions">
            <button
              className="table-action"
              onClick={() => void handlePreviewVideo(video, index)}
              disabled={!hasMedia || isLoading}
              title={hasMedia ? (isOpen ? 'Ẩn video' : 'Xem video') : 'Chưa có file media'}
              type="button"
            >
              {isOpen ? <EyeOff size={16} /> : <Eye size={16} />}
              {isLoading ? 'Đang tải' : isOpen ? 'Ẩn' : 'Xem'}
            </button>
            <button
              className="table-action muted-action"
              onClick={() => void handleLoadArtifacts(video, index)}
              disabled={!hasMedia || artifactLoading}
              title={hasMedia ? 'Xem kết quả phân tích đã lưu' : 'Chưa có file media'}
              type="button"
            >
              {artifactLoading ? <RefreshCw className="spin" size={16} /> : <FlaskConical size={16} />}
              Kết quả
            </button>
          </div>
        );
      },
    },
  ];

  const patientColumns: TableColumn<PatientRecord>[] = [
    { key: 'name', label: 'Bệnh nhân', render: (patient) => patientLabel(patient as RecordLike) },
    { key: 'username', label: 'Mã/Tài khoản', render: (patient) => <span className="mono">{textValue(patient.subject_code, patient.username)}</span> },
    { key: 'doctor', label: 'Bác sĩ phụ trách', render: (patient) => textValue(patient.assigned_doctor_username) },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (patient) => <span className={`pill ${patient.active === false ? 'danger' : 'success'}`}>{patient.active === false ? 'Tạm khóa' : 'Hoạt động'}</span>,
    },
  ];

  const symptomColumns: TableColumn<SymptomRecord>[] = [
    { key: 'patient', label: 'Bệnh nhân', render: (symptom) => patientLabel(symptom) },
    { key: 'symptoms', label: 'Triệu chứng', render: (symptom) => textValue(symptom.symptoms, symptom.pain_level) },
    { key: 'pain', label: 'Mức đau', render: (symptom) => textValue(symptom.pain_score, symptom.pain_level) },
    { key: 'time', label: 'Thời gian', render: (symptom) => textValue(symptom.created_at, symptom.timestamp, symptom.time) },
    { key: 'notes', label: 'Ghi chú', render: (symptom) => textValue(symptom.notes) },
  ];

  const evaluationColumns: TableColumn<EvaluationRecord>[] = [
    { key: 'patient', label: 'Bệnh nhân', render: (evaluation) => textValue(evaluation.patient_username) },
    { key: 'video', label: 'Video', render: (evaluation) => textValue(evaluation.video_name) },
    { key: 'result', label: 'Kết quả', render: (evaluation) => textValue(evaluation.doctor_result) },
    { key: 'plan', label: 'Chỉ định', render: (evaluation) => textValue(evaluation.plan) },
    { key: 'time', label: 'Thời gian', render: (evaluation) => textValue(evaluation.time) },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (evaluation) =>
        canManageClinical(session.user.role) ? (
          <button className="table-action danger-action" onClick={() => void handleDeleteEvaluation(evaluation)} disabled={!evaluation.id || formState === 'loading'} type="button">
            <Trash2 size={16} />
            Xóa
          </button>
        ) : (
          'N/A'
        ),
    },
  ];

  const scheduleColumns: TableColumn<ScheduleRecord>[] = [
    { key: 'patient', label: 'Bệnh nhân', render: (schedule) => patientLabel(schedule) },
    { key: 'title', label: 'Nội dung', render: (schedule) => textValue(schedule.title, schedule.exercise_name, schedule.medication_name, schedule.type) },
    { key: 'time', label: 'Thời gian', render: (schedule) => textValue(schedule.datetime, schedule.date, schedule.time) },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (schedule) => <span className={`pill ${statusClass(schedule.status)}`}>{textValue(schedule.status, 'Đang theo dõi')}</span>,
    },
    { key: 'notes', label: 'Ghi chú', render: (schedule) => textValue(schedule.notes) },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (schedule) =>
        canManageClinical(session.user.role) ? (
          <button className="table-action danger-action" onClick={() => void handleDeleteSchedule(schedule)} disabled={!schedule.id || formState === 'loading'} type="button">
            <Trash2 size={16} />
            Xóa
          </button>
        ) : (
          'N/A'
        ),
    },
  ];

  const researchColumns: TableColumn<ResearchRecord>[] = [
    { key: 'subject', label: 'Đối tượng', render: (record) => patientLabel(record) },
    { key: 'result', label: 'Kết quả', render: (record) => textValue(record.general_result, record.doctor_result, record.result) },
    { key: 'exercise', label: 'Bài tập/Video', render: (record) => textValue(record.exercise, record.video_name) },
    { key: 'time', label: 'Thời gian', render: (record) => textValue(record.created_at, record.timestamp, record.time) },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (record) =>
        session.user.role !== PATIENT_ROLE ? (
          <button className="table-action danger-action" onClick={() => void handleDeleteResearchRecord(record)} disabled={!record.id || formState === 'loading'} type="button">
            <Trash2 size={16} />
            Xóa
          </button>
        ) : (
          'N/A'
        ),
    },
  ];

  const userColumns: TableColumn<PatientRecord>[] = [
    { key: 'username', label: 'Tài khoản', render: (user) => <span className="mono">{textValue(user.username)}</span> },
    { key: 'name', label: 'Họ tên', render: (user) => textValue(user.full_name) },
    { key: 'role', label: 'Vai trò', render: (user) => textValue(user.role) },
    { key: 'email', label: 'Email', render: (user) => textValue(user.email) },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (user) => <span className={`pill ${user.active === false ? 'danger' : 'success'}`}>{user.active === false ? 'Tạm khóa' : 'Hoạt động'}</span>,
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (user) =>
        user.username === session.user.username || user.username === 'admin' ? (
          'N/A'
        ) : (
          <button className="table-action danger-action" onClick={() => void handleDeleteUser(user)} disabled={!user.username || formState === 'loading'} type="button">
            <Trash2 size={16} />
            Xóa
          </button>
        ),
    },
  ];

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark small">
            <Activity size={20} />
          </div>
          <div>
            <strong>Rehab AI</strong>
            <span>Monitor Workspace</span>
          </div>
        </div>
        <div className="user-panel">
          <UserRound size={22} />
          <div>
            <strong>{session.user.full_name || session.user.username}</strong>
            <span>{session.user.role}</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Khu vực dữ liệu">
          {availableViews.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                className={`nav-button ${activeView === view.id ? 'active' : ''}`}
                onClick={() => setActiveView(view.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{view.label}</span>
                <strong>{countLabel(view.count)}</strong>
              </button>
            );
          })}
        </nav>
        <details className="sidebar-section">
          <summary>
            <KeyRound size={16} />
            Đổi mật khẩu
          </summary>
          <form className="mini-form" onSubmit={handleChangePassword}>
            <input name="old_password" type="password" autoComplete="current-password" placeholder="Mật khẩu hiện tại" required />
            <input name="new_password" type="password" autoComplete="new-password" placeholder="Mật khẩu mới" minLength={6} required />
            <input name="confirm_password" type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" minLength={6} required />
            <button className="secondary-button" type="submit" disabled={formState === 'loading'}>
              <KeyRound size={16} />
              Cập nhật
            </button>
          </form>
        </details>
        <button className="secondary-button" onClick={() => void handleLogout()}>
          <LogOut size={18} />
          Đăng xuất
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{roleWorkspaceEyebrow(session.user.role)}</p>
            <h1>{roleWorkspaceTitle(session.user.role)}</h1>
          </div>
          <button className="icon-button" onClick={() => void loadDashboard()} disabled={loadState === 'loading'} title="Tải lại dữ liệu">
            <RefreshCw className={loadState === 'loading' ? 'spin' : ''} size={18} />
          </button>
        </header>

        <section className="metrics-grid">
          {metricCards.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong className={metric.value === 'OK' ? 'success-text' : metric.value === 'Lỗi' ? 'danger-text' : ''}>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{availableViews.find((view) => view.id === activeView)?.label || 'Dữ liệu'}</h2>
              <p>{activeCount} mục đang hiển thị</p>
            </div>
            {activeView === 'home' ? null : (
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Lọc theo tên, mã, bài tập, trạng thái..." />
            )}
          </div>

          {message ? <div className="alert inline">{message}</div> : null}

          {activeView === 'home' ? (
            <section className="role-home">
              <div className="role-hero">
                <div>
                  <p className="eyebrow">{session.user.role}</p>
                  <h2>{roleWorkspaceTitle(session.user.role)}</h2>
                  <p>
                    {session.user.role === PATIENT_ROLE
                      ? 'Theo dõi buổi tập, khai báo triệu chứng và nhận lịch nhắc từ nhóm điều trị.'
                      : session.user.role === DOCTOR_ROLE
                        ? 'Xem video bệnh nhân, ghi nhận đánh giá lâm sàng và tạo lịch chăm sóc.'
                        : session.user.role === RESEARCHER_ROLE
                          ? 'Phân tích video, chuẩn hóa dữ liệu nghiên cứu và theo dõi kết quả AI.'
                          : 'Quản lý tài khoản, dữ liệu và trạng thái vận hành của hệ thống.'}
                  </p>
                </div>
              </div>
              <div className="workflow-grid">
                {workflowCards.map((card) => (
                  <button className="workflow-card" key={card.title} onClick={() => setActiveView(card.view)} type="button">
                    <span>{viewLabelForRole(card.view, session.user.role)}</span>
                    <strong>{card.title}</strong>
                    <p>{card.body}</p>
                    <ArrowRight size={18} />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeView === 'videos' && session.user.role === PATIENT_ROLE ? (
            <form className="data-form" onSubmit={handleUploadVideo}>
              <div className="form-grid">
                <label>
                  Họ và tên
                  <input name="full_name" defaultValue={session.user.full_name || session.user.username} required />
                </label>
                <label>
                  Bài tập
                  <input name="exercise" placeholder="VD: Codman" required />
                </label>
                <label>
                  Video tập luyện
                  <input name="file" type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,.mp4,.mov,.avi,.mkv,.webm,.m4v" required />
                </label>
              </div>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={formState === 'loading'}>
                  {formState === 'loading' ? <RefreshCw className="spin" size={18} /> : <FileVideo size={18} />}
                  Gửi video
                </button>
                <span className="form-help">Hỗ trợ MP4, MOV, AVI, MKV, WebM; tối đa 300MB.</span>
                {formMessage ? (
                  <span className={formState === 'error' ? 'form-status error' : 'form-status ok'}>{formMessage}</span>
                ) : null}
              </div>
            </form>
          ) : null}

          {activeView === 'symptoms' && session.user.role === PATIENT_ROLE ? (
            <form className="data-form" onSubmit={handleCreateSymptom}>
              <div className="form-grid">
                <label>
                  Họ và tên
                  <input name="full_name" defaultValue={session.user.full_name || session.user.username} required />
                </label>
                <label>
                  Mã định danh
                  <input name="patient_id" defaultValue={session.user.username} required />
                </label>
                <label>
                  Tuổi
                  <input name="age" type="number" min="0" max="120" defaultValue="22" required />
                </label>
                <label>
                  Giới tính
                  <select name="gender" required defaultValue="">
                    <option value="" disabled>
                      Chọn giới tính
                    </option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </label>
                <label>
                  Bài tập
                  <input name="exercise" placeholder="VD: Codman" required />
                </label>
                <label>
                  Mức đau VAS
                  <input name="vas" type="number" min="0" max="10" defaultValue="3" required />
                </label>
              </div>
              <label>
                Mô tả triệu chứng
                <textarea name="symptoms" rows={4} placeholder="VD: Đau nhói ở khớp vai khi nâng tay lên cao..." required />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={formState === 'loading'}>
                  {formState === 'loading' ? <RefreshCw className="spin" size={18} /> : <ClipboardList size={18} />}
                  Gửi khai báo
                </button>
                {formMessage ? (
                  <span className={formState === 'error' ? 'form-status error' : 'form-status ok'}>{formMessage}</span>
                ) : null}
              </div>
            </form>
          ) : null}

          {activeView === 'videos' && canManageClinical(session.user.role) ? (
            <form className="data-form" onSubmit={handleCreateEvaluation}>
              <div className="form-grid">
                <label>
                  Video cần đánh giá
                  <select name="video_key" required defaultValue="">
                    <option value="" disabled>
                      Chọn video
                    </option>
                    {filteredVideos.map((video, index) => (
                      <option key={videoKey(video, index)} value={videoKey(video, index)}>
                        {patientLabel(video as RecordLike)} - {textValue(video.exercise)} - {textValue(video.video_name)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Kết quả
                  <select name="doctor_result" required defaultValue="Gần đúng">
                    <option value="Đúng">Đúng</option>
                    <option value="Gần đúng">Gần đúng</option>
                    <option value="Sai">Sai</option>
                  </select>
                </label>
                <label>
                  Chỉ định
                  <select name="plan" required defaultValue="Tiếp tục">
                    <option value="Tiếp tục">Tiếp tục</option>
                    <option value="Chuyển bài">Chuyển bài</option>
                    <option value="Khám lại">Khám lại</option>
                  </select>
                </label>
              </div>
              <div className="check-row">
                {['Vị trí tay chưa đúng', 'Biên độ chưa đạt', 'Tốc độ quá nhanh/chậm', 'Sai tư thế thân người'].map((error) => (
                  <label key={error}>
                    <input name="errors" type="checkbox" value={error} />
                    {error}
                  </label>
                ))}
              </div>
              <div className="form-grid two">
                <label>
                  Nhận xét cho bệnh nhân
                  <textarea name="comments" rows={3} placeholder="Nhận xét ngắn gọn cho bệnh nhân" />
                </label>
                <label>
                  Ghi chú cho NCV
                  <textarea name="comments_ncv" rows={3} placeholder="Ghi chú chuyên môn cho nghiên cứu viên" />
                </label>
              </div>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={formState === 'loading'}>
                  <ClipboardList size={18} />
                  Lưu đánh giá
                </button>
                {formMessage ? <span className={formState === 'error' ? 'form-status error' : 'form-status ok'}>{formMessage}</span> : null}
              </div>
            </form>
          ) : null}

          {activeView === 'schedules' && canManageClinical(session.user.role) ? (
            <form className="data-form" onSubmit={handleCreateSchedule}>
              <div className="form-grid">
                <label>
                  Bệnh nhân
                  <select name="patient_username" required defaultValue="">
                    <option value="" disabled>
                      Chọn bệnh nhân
                    </option>
                    {patients.map((patient, index) => (
                      <option key={recordKey('patient-option', patient as RecordLike, index)} value={patient.username}>
                        {patientLabel(patient as RecordLike)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Loại lịch
                  <select name="type" defaultValue="appointment">
                    <option value="appointment">Lịch hẹn khám</option>
                    <option value="exercise">Lịch tập luyện</option>
                    <option value="medication">Lịch uống thuốc</option>
                  </select>
                </label>
                <label>
                  Thời gian
                  <input name="datetime" type="datetime-local" />
                </label>
                <label>
                  Tiêu đề
                  <input name="title" placeholder="VD: Khám lại khớp vai" />
                </label>
                <label>
                  Bài tập
                  <input name="exercise_name" placeholder="VD: Codman" />
                </label>
                <label>
                  Thuốc / Liều
                  <input name="medication_name" placeholder="Tên thuốc" />
                </label>
                <label>
                  Tần suất
                  <input name="frequency" placeholder="VD: Hàng ngày" />
                </label>
                <label>
                  Liều lượng
                  <input name="dosage" placeholder="VD: 1 viên/lần" />
                </label>
              </div>
              <label>
                Ghi chú
                <textarea name="notes" rows={3} placeholder="Ghi chú cho bệnh nhân" />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={formState === 'loading'}>
                  <CalendarDays size={18} />
                  Thêm lịch
                </button>
                {formMessage ? <span className={formState === 'error' ? 'form-status error' : 'form-status ok'}>{formMessage}</span> : null}
              </div>
            </form>
          ) : null}

          {activeView === 'research' && canCreateResearch(session.user.role) ? (
            <form className="data-form" onSubmit={handleCreateResearchRecord}>
              <div className="form-grid">
                <label>
                  Bệnh nhân
                  <select name="patient_username" required defaultValue="">
                    <option value="" disabled>
                      Chọn bệnh nhân
                    </option>
                    {patients.map((patient, index) => (
                      <option key={recordKey('research-patient', patient as RecordLike, index)} value={patient.username}>
                        {patientLabel(patient as RecordLike)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Mã đối tượng
                  <input name="subject_code" placeholder="VD: BN001" />
                </label>
                <label>
                  Tuổi
                  <input name="age" type="number" min="0" max="120" defaultValue="40" />
                </label>
                <label>
                  Giới tính
                  <select name="gender" defaultValue="Nam">
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </label>
                <label>
                  Chẩn đoán
                  <input name="diagnosis" placeholder="VD: M75.0" />
                </label>
                <label>
                  Bài tập
                  <input name="exercise" placeholder="VD: Codman" />
                </label>
                <label>
                  Kết quả
                  <select name="general_result" defaultValue="Gần đúng">
                    <option value="Đúng">Đúng</option>
                    <option value="Gần đúng">Gần đúng</option>
                    <option value="Sai">Sai</option>
                  </select>
                </label>
                <label>
                  Chỉ định
                  <select name="plan" defaultValue="Tiếp tục">
                    <option value="Tiếp tục">Tiếp tục</option>
                    <option value="Chuyển bài">Chuyển bài</option>
                    <option value="Khám lại">Khám lại</option>
                  </select>
                </label>
                <label>
                  Thiết bị quay
                  <select name="recording_device" defaultValue="Điện thoại">
                    <option value="Điện thoại">Điện thoại</option>
                    <option value="Webcam">Webcam</option>
                    <option value="Khác">Khác</option>
                  </select>
                </label>
                <label>
                  Góc quay
                  <select name="recording_angle" defaultValue="Chính diện">
                    <option value="Chính diện">Chính diện</option>
                    <option value="Bên trái">Bên trái</option>
                    <option value="Bên phải">Bên phải</option>
                  </select>
                </label>
              </div>
              <label>
                Nhận xét chuyên môn
                <textarea name="specialist_comment" rows={3} placeholder="Nhận xét phục vụ nghiên cứu" />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={formState === 'loading'}>
                  <FlaskConical size={18} />
                  Lưu phiếu
                </button>
                {formMessage ? <span className={formState === 'error' ? 'form-status error' : 'form-status ok'}>{formMessage}</span> : null}
              </div>
            </form>
          ) : null}

          {activeView === 'users' && canManageUsers(session.user.role) ? (
            <form className="data-form" onSubmit={handleCreateUser}>
              <div className="form-grid">
                <label>
                  Tên đăng nhập
                  <input name="username" minLength={3} required />
                </label>
                <label>
                  Họ tên
                  <input name="full_name" required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" />
                </label>
                <label>
                  Mật khẩu tạm
                  <input name="password" type="password" minLength={6} required />
                </label>
                <label>
                  Vai trò
                  <select name="role" defaultValue={DOCTOR_ROLE}>
                    <option value={DOCTOR_ROLE}>Bác sĩ / KTV PHCN</option>
                    <option value={RESEARCHER_ROLE}>Nghiên cứu viên</option>
                    <option value={ADMIN_ROLE}>Quản trị viên</option>
                    <option value={PATIENT_ROLE}>Bệnh nhân</option>
                  </select>
                </label>
                <label>
                  BN phụ trách
                  <input name="assigned_patient_usernames" placeholder="patient01, patient02" />
                </label>
              </div>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={formState === 'loading'}>
                  <UserPlus size={18} />
                  Tạo tài khoản
                </button>
                {formMessage ? <span className={formState === 'error' ? 'form-status error' : 'form-status ok'}>{formMessage}</span> : null}
              </div>
            </form>
          ) : null}

          {activeView === 'videos' && videoPreview ? (
            <div className="video-preview">
              <div className="preview-header">
                <span className="video-name">
                  <FileVideo size={16} />
                  {videoPreview.label}
                </span>
                <button className="table-action" onClick={clearVideoPreview} type="button" title="Ẩn video">
                  <EyeOff size={16} />
                  Ẩn
                </button>
              </div>
              <video src={videoPreview.url} controls preload="metadata" />
            </div>
          ) : null}

          {activeView === 'videos' && analysisArtifacts ? (
            <div className="artifact-panel">
              <div className="subpanel-header">
                <div>
                  <h3>Kết quả phân tích</h3>
                  <span>
                    {analysisArtifacts.video.video_name} - {textValue(analysisArtifacts.video.exercise)}
                  </span>
                </div>
                <button className="table-action muted-action" onClick={() => setAnalysisArtifacts(null)} type="button">
                  <EyeOff size={16} />
                  Ẩn
                </button>
              </div>
              <div className="artifact-metrics">
                {Object.entries(analysisArtifacts.metrics).slice(0, 8).map(([key, value]) => (
                  <div className="artifact-metric" key={key}>
                    <span>{metricLabel(key)}</span>
                    <strong>{textValue(value)}</strong>
                  </div>
                ))}
                {!Object.keys(analysisArtifacts.metrics).length ? (
                  <div className="artifact-metric">
                    <span>Accuracy</span>
                    <strong>{textValue(analysisArtifacts.video.accuracy)}</strong>
                  </div>
                ) : null}
              </div>
              <div className="artifact-grid">
                {analysisArtifacts.items.map((item) => (
                  <div className={`artifact-item ${item.available ? '' : 'disabled'}`} key={item.kind}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.filename || 'Chưa có file'} · {item.available ? fileSizeLabel(item.size) : 'Chưa sẵn sàng'}</span>
                    </div>
                    <button
                      className="table-action"
                      disabled={!item.available || artifactState === 'loading'}
                      onClick={() => void handleDownloadArtifact(item.kind, item.filename)}
                      type="button"
                    >
                      {artifactState === 'loading' ? <RefreshCw className="spin" size={16} /> : <FileVideo size={16} />}
                      Tải
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeView === 'videos' && previewMessage ? <div className="alert inline">{previewMessage}</div> : null}
          {activeView === 'videos' && analysisMessage ? (
            <div className={analysisState === 'error' ? 'alert inline' : 'status-line inline ok'}>{analysisMessage}</div>
          ) : null}
          {activeView === 'videos' && artifactMessage ? (
            <div className={artifactState === 'error' ? 'alert inline' : 'status-line inline ok'}>{artifactMessage}</div>
          ) : null}

          {activeView === 'videos' ? (
            <>
              <DataTable columns={videoColumns} items={filteredVideos} emptyText="Chưa có video phù hợp." rowKey={videoKey} />
              {canManageClinical(session.user.role) ? (
                <div className="subpanel">
                  <div className="subpanel-header">
                    <h3>Đánh giá lâm sàng</h3>
                    <span>{evaluations.length} bản ghi</span>
                  </div>
                  <DataTable
                    columns={evaluationColumns}
                    items={evaluations.filter((evaluation) => matchesQuery(evaluation as RecordLike, query))}
                    emptyText="Chưa có đánh giá phù hợp."
                    rowKey={(evaluation, index) => recordKey('evaluation', evaluation as RecordLike, index)}
                  />
                </div>
              ) : null}
            </>
          ) : null}
          {activeView === 'patients' ? (
            <DataTable
              columns={patientColumns}
              items={filteredPatients}
              emptyText="Chưa có hồ sơ bệnh nhân phù hợp."
              rowKey={(patient, index) => recordKey('patient', patient as RecordLike, index)}
            />
          ) : null}
          {activeView === 'symptoms' ? (
            <DataTable
              columns={symptomColumns}
              items={filteredSymptoms}
              emptyText="Chưa có khai báo triệu chứng phù hợp."
              rowKey={(symptom, index) => recordKey('symptom', symptom, index)}
            />
          ) : null}
          {activeView === 'schedules' ? (
            <DataTable
              columns={scheduleColumns}
              items={filteredSchedules}
              emptyText="Chưa có lịch nhắc phù hợp."
              rowKey={(schedule, index) => recordKey('schedule', schedule, index)}
            />
          ) : null}
          {activeView === 'research' ? (
            <DataTable
              columns={researchColumns}
              items={filteredResearch}
              emptyText="Chưa có dữ liệu nghiên cứu phù hợp."
              rowKey={(record, index) => recordKey('research', record, index)}
            />
          ) : null}
          {activeView === 'users' ? (
            <DataTable
              columns={userColumns}
              items={filteredUsers}
              emptyText="Chưa có tài khoản phù hợp."
              rowKey={(user, index) => recordKey('user', user as RecordLike, index)}
            />
          ) : null}
        </section>
      </section>
    </main>
  );
}
