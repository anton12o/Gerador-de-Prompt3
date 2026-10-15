import type { GenerateScriptPayload, ScriptResult } from '../types';

export async function generateScriptApi(payload: GenerateScriptPayload): Promise<ScriptResult> {
  const response = await fetch('/api/generate-script', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMessage);
  }

  const data: ScriptResult = await response.json();
  return data;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}
