import { decodeToken, inspectToken } from "@/utils/token";

const ACCESS_TOKEN_KEY = "access_token";

function makeJwt(payload: Record<string, unknown>): string {
  const toBase64Url = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  return `${toBase64Url({ alg: "HS256", typ: "JWT" })}.${toBase64Url(payload)}.fakesig`;
}

const VALID_PAYLOAD = {
  sub: "user-1",
  email: "test@example.com",
  role: "ADMIN",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

beforeEach(() => localStorage.clear());

describe("decodeToken", () => {
  it("returns the decoded payload for a valid token", () => {
    const token = makeJwt(VALID_PAYLOAD);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);

    const result = decodeToken(token);

    expect(result).toMatchObject({
      sub: "user-1",
      email: "test@example.com",
      role: "ADMIN",
    });
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(token);
  });

  it("returns null and clears localStorage for an expired token", () => {
    const expiredToken = makeJwt({ ...VALID_PAYLOAD, exp: Math.floor(Date.now() / 1000) - 1 });
    localStorage.setItem(ACCESS_TOKEN_KEY, expiredToken);

    const result = decodeToken(expiredToken);

    expect(result).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });

  it("returns null and clears localStorage for a malformed JWT", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "not.a.jwt");

    const result = decodeToken("not.a.jwt");

    expect(result).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });

  it("returns null and clears localStorage when exp is missing", () => {
    const noExp = { sub: VALID_PAYLOAD.sub, email: VALID_PAYLOAD.email, role: VALID_PAYLOAD.role };
    const token = makeJwt(noExp);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);

    const result = decodeToken(token);

    expect(result).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });
});

describe("inspectToken", () => {
  it("returns valid + payload for a non-expired token", () => {
    const token = makeJwt(VALID_PAYLOAD);

    const result = inspectToken(token);

    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.payload.sub).toBe(VALID_PAYLOAD.sub);
      expect(result.payload.email).toBe(VALID_PAYLOAD.email);
    }
  });

  it("returns expired for a token past its exp — does not touch localStorage", () => {
    const token = makeJwt({ ...VALID_PAYLOAD, exp: Math.floor(Date.now() / 1000) - 1 });
    localStorage.setItem(ACCESS_TOKEN_KEY, token);

    const result = inspectToken(token);

    expect(result.status).toBe("expired");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(token); // no side-effect
  });

  it("returns invalid for a malformed JWT — does not touch localStorage", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "not.a.jwt");

    const result = inspectToken("not.a.jwt");

    expect(result.status).toBe("invalid");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("not.a.jwt"); // no side-effect
  });

  it("returns invalid when exp is missing — does not touch localStorage", () => {
    const noExp = { sub: VALID_PAYLOAD.sub, email: VALID_PAYLOAD.email, role: VALID_PAYLOAD.role };
    const token = makeJwt(noExp);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);

    const result = inspectToken(token);

    expect(result.status).toBe("invalid");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(token); // no side-effect
  });
});
