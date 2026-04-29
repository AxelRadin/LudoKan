import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LS_KEY = 'fx-backend-connector:v1';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export default function BackendConnector() {
  const { t } = useTranslation();
  const envBase = import.meta.env?.VITE_API_BASE_URL ?? '';
  const [baseUrl, setBaseUrl] = useState<string>(envBase);
  const [endpoint, setEndpoint] = useState('/health');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headersText, setHeadersText] = useState(
    'Content-Type: application/json\n'
  );
  const [bearer, setBearer] = useState('');
  const [bodyText, setBodyText] = useState('{\n  "hello": "world"\n}\n');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [responsePreview, setResponsePreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [sizeBytes, setSizeBytes] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setBaseUrl(data.baseUrl ?? envBase ?? '');
        setEndpoint(data.endpoint ?? '/health');
        setMethod(data.method ?? 'GET');
        setHeadersText(data.headersText ?? 'Content-Type: application/json\n');
        setBearer(data.bearer ?? '');
        setBodyText(data.bodyText ?? '{\n  "hello": "world"\n}\n');
      }
    } catch (e) {
      console.warn(
        'BackendConnector: unable to restore state from localStorage',
        e
      );
    }
  }, [envBase]);

  useEffect(() => {
    const data = { baseUrl, endpoint, method, headersText, bearer, bodyText };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn(
        'BackendConnector: unable to persist state to localStorage',
        e
      );
    }
  }, [baseUrl, endpoint, method, headersText, bearer, bodyText]);

  const url = useMemo(() => {
    const b = baseUrl.trim().replace(/\/$/, '');
    const trimmedEndpoint = endpoint.trim();
    let e = '';
    if (trimmedEndpoint.length > 0) {
      e = trimmedEndpoint.startsWith('/')
        ? trimmedEndpoint
        : `/${trimmedEndpoint}`;
    }
    return `${b}${e}`;
  }, [baseUrl, endpoint]);

  const parsedHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    headersText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .forEach(line => {
        const i = line.indexOf(':');
        if (i > 0) {
          const k = line.slice(0, i).trim();
          const v = line.slice(i + 1).trim();
          if (k) h[k] = v;
        }
      });
    if (bearer) h['Authorization'] = `Bearer ${bearer.trim()}`;
    return h;
  }, [headersText, bearer]);

  const curl = useMemo(() => {
    const headerFlags = Object.entries(parsedHeaders)
      .map(([k, v]) => `-H ${JSON.stringify(k + ': ' + v)}`)
      .join(' ');
    const bodyFlag =
      method === 'GET' || method === 'DELETE'
        ? ''
        : `--data ${JSON.stringify(bodyText)}`;
    const m = method === 'GET' ? '' : `-X ${method}`;
    return `curl ${m} ${headerFlags} ${bodyFlag} ${JSON.stringify(url)}`
      .replaceAll(/\s+/g, ' ')
      .trim();
  }, [parsedHeaders, bodyText, method, url]);

  const send = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    setLatency(null);
    setResponsePreview('');
    setSizeBytes(null);
    try {
      if (!url || !/^https?:\/\//.test(url)) {
        throw new Error('URL invalide. Ex.: https://api.exemple.com/health');
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const started = performance.now();
      const init: RequestInit = {
        method,
        headers: parsedHeaders,
        signal: controller.signal,
      };
      if (method !== 'GET' && method !== 'DELETE') {
        const looksJson =
          bodyText.trim().startsWith('{') || bodyText.trim().startsWith('[');
        init.body = bodyText;
        if (looksJson && !('Content-Type' in parsedHeaders)) {
          (init.headers as Record<string, string>)['Content-Type'] =
            'application/json';
        }
      }
      const res = await fetch(url, init);
      const ended = performance.now();
      clearTimeout(timeout);
      setLatency(Math.round(ended - started));
      setStatus(`${res.status} ${res.statusText || ''}`.trim());
      const ct = res.headers.get('content-type') || '';
      let txt = await res.text();
      setSizeBytes(new Blob([txt]).size);
      if (ct.includes('application/json')) {
        try {
          txt = JSON.stringify(JSON.parse(txt), null, 2);
        } catch (e) {
          console.warn(e);
        }
      }
      setResponsePreview(txt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url, method, parsedHeaders, bodyText]);

  const quickHealth = useCallback(() => {
    setEndpoint('/health');
    setMethod('GET');
    setBodyText('\n');
    send();
  }, [send]);

  // styles inchangés...
  const box: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
  };
  const input: React.CSSProperties = {
    width: '100%',
    border: '1px solid #ddd',
    borderRadius: 10,
    padding: 8,
  };
  const textarea: React.CSSProperties = {
    ...input,
    height: 140,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
  };
  const btn: React.CSSProperties = {
    borderRadius: 10,
    padding: '8px 12px',
    border: '1px solid #ddd',
    background: '#111',
    color: '#fff',
  };
  const btnGhost: React.CSSProperties = {
    borderRadius: 10,
    padding: '8px 12px',
    border: '1px solid #ddd',
    background: '#f7f7f7',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f6f6f7', color: '#111' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>
            🔗 {t('backendConnector.title')}
          </h1>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(curl)}
            style={{
              fontSize: 12,
              color: '#666',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {t('backendConnector.copyurl')}
          </button>
        </header>

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: '1fr',
            alignItems: 'start',
          }}
        >
          <div style={{ ...box }}>
            <label htmlFor="base-url" style={{ fontSize: 13, fontWeight: 600 }}>
              {t('backendConnector.baseUrl')}
            </label>
            <input
              id="base-url"
              style={{ ...input, marginTop: 6 }}
              placeholder="https://api.exemple.com"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
            />

            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: '160px 1fr',
                marginTop: 12,
              }}
            >
              <div>
                <label
                  htmlFor="http-method"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {t('backendConnector.method')}
                </label>
                <select
                  id="http-method"
                  style={{ ...input, marginTop: 6 }}
                  value={method}
                  onChange={e => setMethod(e.target.value as HttpMethod)}
                >
                  {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map(
                    m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label
                  htmlFor="endpoint"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {t('backendConnector.endpoint')}
                </label>
                <input
                  id="endpoint"
                  style={{ ...input, marginTop: 6 }}
                  placeholder="/health"
                  value={endpoint}
                  onChange={e => setEndpoint(e.target.value)}
                />
              </div>
            </div>

            {method !== 'GET' && method !== 'DELETE' && (
              <div style={{ marginTop: 12 }}>
                <label htmlFor="body" style={{ fontSize: 13, fontWeight: 600 }}>
                  {t('backendConnector.body')}
                </label>
                <textarea
                  id="body"
                  style={{ ...textarea, marginTop: 6 }}
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                />
              </div>
            )}
          </div>

          <div
            style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}
          >
            <div style={{ ...box }}>
              <label
                htmlFor="bearer-token"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {t('backendConnector.bearerToken')}
              </label>
              <input
                id="bearer-token"
                style={{ ...input, marginTop: 6 }}
                placeholder="eyJhbGciOi..."
                value={bearer}
                onChange={e => setBearer(e.target.value)}
              />
              <div style={{ marginTop: 12 }}>
                <label
                  htmlFor="extra-headers"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {t('backendConnector.extraHeaders')}
                </label>
                <textarea
                  id="extra-headers"
                  style={{ ...textarea, height: 120, marginTop: 6 }}
                  placeholder={'Content-Type: application/json\nX-API-Key: xxx'}
                  value={headersText}
                  onChange={e => setHeadersText(e.target.value)}
                />
              </div>
            </div>

            <div style={{ ...box }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button disabled={loading} onClick={send} style={btn}>
                  {loading
                    ? t('backendConnector.sending')
                    : t('backendConnector.send')}
                </button>
                <button
                  disabled={loading}
                  onClick={quickHealth}
                  style={btnGhost}
                >
                  {t('backendConnector.quickTest')}
                </button>
                <code
                  style={{
                    marginLeft: 'auto',
                    fontSize: 12,
                    padding: '6px 8px',
                    background: '#eee',
                    borderRadius: 10,
                    maxWidth: 380,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={url}
                >
                  {url || t('backendConnector.fullUrl')}
                </code>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {t('backendConnector.response')}
                  </span>
                  {status && (
                    <span
                      style={{
                        fontSize: 11,
                        background: '#111',
                        color: '#fff',
                        borderRadius: 999,
                        padding: '2px 6px',
                      }}
                    >
                      {status}
                    </span>
                  )}
                  {latency !== null && (
                    <span
                      style={{
                        fontSize: 11,
                        background: '#eee',
                        borderRadius: 999,
                        padding: '2px 6px',
                      }}
                    >
                      {latency} ms
                    </span>
                  )}
                  {sizeBytes !== null && (
                    <span
                      style={{
                        fontSize: 11,
                        background: '#eee',
                        borderRadius: 999,
                        padding: '2px 6px',
                      }}
                    >
                      {sizeBytes} bytes
                    </span>
                  )}
                </div>
                <pre
                  style={{
                    marginTop: 8,
                    maxHeight: 320,
                    overflow: 'auto',
                    background: '#0b0b0c',
                    color: '#f7f7f7',
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 12,
                  }}
                >
                  {responsePreview ||
                    (error
                      ? t('backendConnector.error', { message: error })
                      : t('backendConnector.noResponse'))}
                </pre>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {t('backendConnector.curlCommand')}
                </div>
                <pre
                  style={{
                    maxHeight: 160,
                    overflow: 'auto',
                    background: '#0b0b0c',
                    color: '#f7f7f7',
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 11,
                  }}
                >
                  {curl}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...box, marginTop: 16, background: '#fffdf7' }}>
          <div style={{ fontSize: 12, color: '#555' }}>
            <b>{t('backendConnector.tips.title')}</b>
            <ul style={{ marginTop: 6, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>{t('backendConnector.tips.dev')}</li>
              <li>{t('backendConnector.tips.cors')}</li>
              <li>{t('backendConnector.tips.health')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
