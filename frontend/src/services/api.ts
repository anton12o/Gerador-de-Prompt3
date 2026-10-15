import type { GenerateScriptPayload, ScriptResult } from '../types';

export async function generateScriptApi(payload: GenerateScriptPayload): Promise<ScriptResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout

  try {
    const response = await fetch('/api/generate-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
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
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(
        'A requisição demorou mais de 60 segundos e expirou (Timeout). Verifique se o servidor backend está rodando no terminal.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch('/api/health', { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

