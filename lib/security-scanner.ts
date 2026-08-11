export interface ScanResult {
  hasSensitive: boolean;
  matchType?: string;
  matchedText?: string;
}

export function scanSensitiveData(content: string): ScanResult {
  const patterns = [
    { type: "OpenAI / Cloud API Key", regex: /(sk-[a-zA-Z0-9]{32,}|AKIA[0-9A-Z]{16})/ },
    { type: "Database Connection String", regex: /(postgres|postgresql|mysql|mongodb):\/\/[^:]+:[^@]+@/i },
    {
      type: "Hardcoded Password",
      regex: /(password|passwd|secret|private_key)\s*[:=]\s*(?:['"][^'"]+['"]|[^\s,;]+)/i,
    },
    {
      type: "Bearer Token",
      regex: /authorization\s*:\s*bearer\s+[a-zA-Z0-9._~+/-]{6,}/i,
    },
    { type: "Private RSA Key", regex: /-----BEGIN (RSA )?PRIVATE KEY-----/ },
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern.regex);
    if (match) {
      return {
        hasSensitive: true,
        matchType: pattern.type,
        matchedText: match[0].substring(0, 15) + "...",
      };
    }
  }

  return { hasSensitive: false };
}
