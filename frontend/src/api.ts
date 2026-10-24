export type Status = "Applied" | "Screening" | "Interview" | "Offer" | "Rejected";
export type WorkMode = "Remote" | "Hybrid" | "On-site";

export interface Application {
  id: number;
  company: string;
  role: string;
  location: string;
  work_mode: WorkMode;
  status: Status;
  applied_on: string;
  salary: string;
  job_url: string;
  notes: string;
  created_at: string;
}

export interface ApplicationInput {
  company: string;
  role: string;
  location: string;
  work_mode: WorkMode;
  status: Status;
  applied_on: string;
  salary: string;
  job_url: string;
  notes: string;
}

export interface Dashboard {
  total: number;
  interviews: number;
  offers: number;
  response_rate: number;
  stage_counts: Record<Status, number>;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(body?.detail ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  listApplications(search = "", status = "") {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    const queryString = query.toString();
    const suffix = queryString ? `?${queryString}` : "";
    return request<Application[]>(`/applications${suffix}`);
  },
  getDashboard: () => request<Dashboard>("/dashboard"),
  createApplication: (input: ApplicationInput) =>
    request<Application>("/applications", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateApplication: (id: number, changes: Partial<ApplicationInput>) =>
    request<Application>(`/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),
  deleteApplication: (id: number) =>
    request<void>(`/applications/${id}`, { method: "DELETE" }),
};
