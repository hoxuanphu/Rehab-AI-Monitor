import { expect, test } from '@playwright/test';
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '..');
const scratchRoot = path.join(repoRoot, 'scratch', 'web-e2e-smoke');
const backendPort = 8010;
const frontendPort = 5183;
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

let backendProcess: ChildProcessWithoutNullStreams | undefined;
let frontendProcess: ChildProcessWithoutNullStreams | undefined;

function writeJson(filePath: string, data: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function spawnServer(command: string, args: string[], options: { cwd: string; env?: NodeJS.ProcessEnv }) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    shell: process.platform === 'win32',
  });
  child.stdout.on('data', (data) => process.stdout.write(`[${path.basename(command)}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[${path.basename(command)}] ${data}`));
  return child;
}

async function waitForOk(url: string, timeoutMs = 20_000) {
  const startedAt = Date.now();
  let lastError = '';
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

async function stopServer(child: ChildProcessWithoutNullStreams | undefined) {
  if (!child || child.killed) {
    return;
  }
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      execFile('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], () => resolve());
    });
    return;
  }
  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
      resolve();
    }, 2_000);
  });
}

test.beforeAll(async () => {
  rmSync(scratchRoot, { recursive: true, force: true });
  const databaseDir = path.join(scratchRoot, 'database');
  mkdirSync(databaseDir, { recursive: true });

  writeJson(path.join(databaseDir, 'users.json'), {
    patient01: {
      username: 'patient01',
      full_name: 'Patient One',
      email: 'patient01@example.test',
      role: 'Bệnh nhân',
      active: true,
      password: '29d26d3fb01e2123ef8282260405597c7b4f8c1756984259142472d9519966cf',
      hash_version: 'sha256',
    },
  });
  writeJson(path.join(databaseDir, 'video_list.json'), [
    {
      username: 'patient01',
      full_name: 'Patient One',
      video_name: 'patient01_clip.mp4',
      stored_filename: 'patient01_clip.mp4',
      exercise: 'Codman',
      status: 'Chờ NCV phân tích',
      accuracy: 0,
      time: '2026-06-19T07:00:00Z',
    },
  ]);
  writeJson(path.join(databaseDir, 'doctor_evaluations.json'), [
    {
      patient_username: 'patient01',
      video_name: 'patient01_clip.mp4',
      exercise: 'Codman',
      doctor_result: 'Gần đúng',
      comments: 'Tiếp tục theo dõi',
      time: '2026-06-19T07:05:00Z',
    },
  ]);
  writeJson(path.join(databaseDir, 'patient_symptoms.json'), [
    {
      username: 'patient01',
      full_name: 'Patient One',
      exercise: 'Codman',
      symptoms: 'Đau nhẹ',
      vas: 3,
      time: '2026-06-19T07:10:00Z',
    },
  ]);
  writeJson(path.join(databaseDir, 'schedules.json'), [
    {
      patient_username: 'patient01',
      title: 'Tập Codman',
      type: 'exercise',
      datetime: '2026-06-20T08:00',
      notes: 'Tập chậm',
    },
  ]);
  writeJson(path.join(databaseDir, 'research_data.json'), []);

  backendProcess = spawnServer(
    path.join(repoRoot, '.venv', 'Scripts', 'python.exe'),
    ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', String(backendPort)],
    {
      cwd: repoRoot,
      env: {
        REHAB_REPO_ROOT: scratchRoot,
        REHAB_DATABASE_DIR: databaseDir,
        REHAB_BACKEND_CORS_ORIGINS: frontendUrl,
      },
    },
  );
  await waitForOk(`${backendUrl}/health`);

  frontendProcess = spawnServer('npm.cmd', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(frontendPort)], {
    cwd: webRoot,
    env: {
      VITE_REHAB_API_URL: backendUrl,
    },
  });
  await waitForOk(frontendUrl);
});

test.afterAll(async () => {
  await stopServer(frontendProcess);
  await stopServer(backendProcess);
  rmSync(scratchRoot, { recursive: true, force: true });
});

test('patient can log in and see scoped dashboard data', async ({ page }) => {
  await page.goto(frontendUrl);
  const loginForm = page.locator('form').filter({ has: page.getByLabel('Tên đăng nhập') });
  await loginForm.getByLabel('Tên đăng nhập').fill('patient01');
  await loginForm.getByLabel('Mật khẩu').fill('patientpass');
  await loginForm.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page.locator('h1', { hasText: 'Không gian tập luyện của bệnh nhân' })).toBeVisible();
  await expect(page.getByText('Patient One')).toBeVisible();
  await expect(page.getByText('Video của tôi').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Khai báo đau/ }).first()).toBeVisible();

  const navigation = page.getByRole('navigation', { name: 'Khu vực dữ liệu' });
  await navigation.getByRole('button', { name: /Video tập luyện/ }).click();
  await expect(page.getByText('patient01_clip.mp4')).toBeVisible();
  await expect(page.getByText('Codman')).toBeVisible();

  await navigation.getByRole('button', { name: /Lịch của tôi/ }).click();
  await expect(page.getByText('Tập Codman')).toBeVisible();
});
