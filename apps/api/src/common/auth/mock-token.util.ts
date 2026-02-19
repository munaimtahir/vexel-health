type MockTokenClaims = {
  tenantId: string;
  userId: string;
  permissions: string[];
};

export function parseMockBearerTokenHeader(
  authorizationHeader: string | undefined,
): MockTokenClaims | null {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  return parseMockToken(token);
}

export function parseMockToken(token: string): MockTokenClaims | null {
  const parts = token.split('.');
  if (parts.length < 3 || parts[0] !== 'mock') {
    return null;
  }

  const tenantId = parts[1]?.trim();
  const userId = parts[2]?.trim();
  if (!tenantId || !userId) {
    return null;
  }

  const permissionsPart = parts.slice(3).join('.').trim();
  const permissions = permissionsPart
    ? permissionsPart
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

  return {
    tenantId,
    userId,
    permissions,
  };
}

