import { apiRequest } from "./apiClient";

export type Device = {
  id: string;
  device_sn: string;
  name: string;
  model_type: string;
  location: string;
  status: string;
  status_label: string;
  last_maintenance: string | null;
};

export type PagedResponse<T> = {
  items: T[];
  count: number;
};

export type Source = {
  source_id: string;
  name: string;
  source_type: "mqtt" | "db";
  type: "mqtt" | "db";
  topic_route: string;
  is_running: boolean;
};

export type WaveformPoint = { time: string; value: number };
export type FftPoint = { freq: number; amp: number };

export type ProcessingConfig = {
  id: number;
  device: string | null;
  window_size: number;
  algorithm: string;
  remove_anomaly: boolean;
  calc_features: boolean;
};

export type FeaturePoint = {
  time: string;
  raw: number;
  denoised: number;
};

export type HealthTrendPoint = {
  date: string;
  value: number;
};

export type HealthAlert = {
  id: number;
  time: string;
  rule: string;
  level: string;
  level_code: "info" | "warning" | "critical";
  desc: string;
};

export type DiagnosisModel = {
  id: number;
  name: string;
  version: string;
  status: "active" | "standby";
  source: string;
  description: string;
};

export type DiagnosisRunResponse = {
  task_id: string;
  status: string;
  result: {
    fault_component: string;
    severity: string;
    confidence: number;
    suggestion: string;
  };
};

export type DiagnosisResultResponse = {
  task_id: string;
  status: string;
  device_id: string | null;
  model: string | null;
  result: {
    fault_component: string;
    severity: string;
    confidence: number;
    suggestion: string;
  } | null;
};

export type Role = {
  id: number;
  name: string;
  permissions: string;
  is_builtin: boolean;
};

export type IntegrationConfig = Record<string, string>;

export async function getDevices(q?: string) {
  return apiRequest<PagedResponse<Device>>("/assets/devices/", { query: { q } });
}

export async function createDevice(payload: Partial<Device> & Pick<Device, "id" | "device_sn" | "name" | "model_type" | "location">) {
  return apiRequest<Device>("/assets/devices/", { method: "POST", body: payload });
}

export async function getSources(deviceId: string) {
  return apiRequest<{ device_id: string; items: Source[]; count: number }>(`/acquisition/devices/${deviceId}/sources/`);
}

export async function createSource(
  deviceId: string,
  payload: { source_id?: string; name: string; source_type: "mqtt" | "db"; topic_route?: string; is_running?: boolean }
) {
  return apiRequest<Source>(`/acquisition/devices/${deviceId}/sources/`, { method: "POST", body: payload });
}

export async function deleteSource(sourceId: string) {
  return apiRequest(`/acquisition/sources/${sourceId}/`, { method: "DELETE" });
}

export async function getWaveform(sourceId: string) {
  return apiRequest<{ source_id: string; points: WaveformPoint[] }>(`/acquisition/signals/${sourceId}/waveform/`);
}

export async function getFft(sourceId: string) {
  return apiRequest<{ source_id: string; bins: FftPoint[] }>(`/acquisition/signals/${sourceId}/fft/`);
}

export async function getProcessingConfig(deviceId?: string) {
  return apiRequest<ProcessingConfig>("/processing/config/", { query: { device_id: deviceId } });
}

export async function updateProcessingConfig(payload: Partial<ProcessingConfig>, deviceId?: string) {
  return apiRequest<ProcessingConfig>("/processing/config/", { method: "PUT", body: payload, query: { device_id: deviceId } });
}

export async function getFeatureStream(deviceId: string, feature: string) {
  return apiRequest<{ device_id: string; feature: string; points: FeaturePoint[] }>("/processing/features/stream/", {
    query: { device_id: deviceId, feature },
  });
}

export async function getHealthTrend(deviceId: string) {
  return apiRequest<{ device_id: string; points: HealthTrendPoint[] }>("/health/trend/", { query: { device_id: deviceId } });
}

export async function getHealthAlerts(deviceId: string) {
  return apiRequest<{ device_id: string; items: HealthAlert[]; count: number }>("/health/alerts/", {
    query: { device_id: deviceId },
  });
}

export async function getDiagnosisModels() {
  return apiRequest<PagedResponse<DiagnosisModel>>("/diagnosis/models/");
}

export async function activateDiagnosisModel(modelId: number) {
  return apiRequest<DiagnosisModel>(`/diagnosis/models/${modelId}/activate/`, { method: "POST" });
}

export async function runDiagnosis(payload: { device_id?: string; model_id?: number; alert_id?: number; requested_by?: string }) {
  return apiRequest<DiagnosisRunResponse>("/diagnosis/run/", { method: "POST", body: payload });
}

export async function getDiagnosisResult(taskId: string) {
  return apiRequest<DiagnosisResultResponse>(`/diagnosis/results/${taskId}/`);
}

export async function getRoles() {
  return apiRequest<{ items: Role[]; count: number }>("/system/roles/");
}

export async function getIntegrations() {
  return apiRequest<IntegrationConfig>("/system/integrations/");
}

export async function updateIntegrations(payload: IntegrationConfig) {
  return apiRequest<IntegrationConfig>("/system/integrations/", { method: "PUT", body: payload });
}
