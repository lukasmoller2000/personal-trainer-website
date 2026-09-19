/**
 * VFG gym-membership lookup.
 *
 * Source of truth is the VFG Member table, reached through the internal
 * server-to-server API (VFG_MEMBERSHIP_API_URL + PT_MEMBERSHIP_API_KEY).
 * Without those env vars the default implementation returns unverified
 * so checkout charges the standard price. Do not fake-verify anyone.
 *
 * Identity: email is primary, phone is secondary. Name is never enough
 * on its own (too many false positives).
 */

export type VfgMembershipStatus = "active" | "inactive" | "not_found" | "unverified";

export type VfgMembershipIdentity = {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
};

export type VfgMembershipLookupResult = {
  verified: boolean;
  active: boolean;
  status: VfgMembershipStatus;
  memberId?: string | null;
  verifiedAt: Date | null;
};

export type VfgPricePreview = "member" | "standard" | "unverified";

export interface VfgMembershipLookup {
  lookup(identity: VfgMembershipIdentity): Promise<VfgMembershipLookupResult>;
}

export function unverifiedMembership(at: Date | null = null): VfgMembershipLookupResult {
  return {
    verified: false,
    active: false,
    status: "unverified",
    memberId: null,
    verifiedAt: at,
  };
}

export function normalizeMembershipEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function normalizeMembershipPhone(phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("45")) return digits.slice(2);
  return digits;
}

function hasStrongIdentity(identity: VfgMembershipIdentity) {
  return Boolean(normalizeMembershipEmail(identity.email) || normalizeMembershipPhone(identity.phone));
}

export function isActiveVfgMember(result: VfgMembershipLookupResult) {
  return result.verified === true && result.active === true && result.status === "active";
}

export function membershipPreviewStatus(result: VfgMembershipLookupResult): VfgPricePreview {
  if (isActiveVfgMember(result)) return "member";
  if (result.verified) return "standard";
  return "unverified";
}

export function vfgPricePreviewMessage(preview: VfgPricePreview) {
  if (preview === "member") return "VFG-medlemspris anvendes";
  if (preview === "standard") return "Standardpris anvendes";
  return "Vi kunne ikke bekræfte et aktivt VFG-medlemskab, så standardprisen anvendes.";
}

export const defaultUnverifiedVfgMembershipLookup: VfgMembershipLookup = {
  async lookup(identity) {
    void identity.name;
    return unverifiedMembership(new Date());
  },
};

type StaticMember = {
  email?: string;
  phone?: string;
  status: "active" | "inactive";
  memberId?: string;
};

/**
 * Test / future-wiring stub. Matches email first, then phone.
 * Never matches on name alone.
 */
export function createStaticVfgMembershipLookup(members: readonly StaticMember[]): VfgMembershipLookup {
  return {
    async lookup(identity) {
      if (!hasStrongIdentity(identity)) return unverifiedMembership(new Date());

      const email = normalizeMembershipEmail(identity.email);
      const phone = normalizeMembershipPhone(identity.phone);
      const match =
        (email ? members.find((row) => normalizeMembershipEmail(row.email) === email) : undefined) ??
        (phone ? members.find((row) => normalizeMembershipPhone(row.phone) === phone) : undefined);

      if (!match) {
        return {
          verified: true,
          active: false,
          status: "not_found",
          memberId: null,
          verifiedAt: new Date(),
        };
      }

      return {
        verified: true,
        active: match.status === "active",
        status: match.status,
        memberId: match.memberId ?? null,
        verifiedAt: new Date(),
      };
    },
  };
}

function opaqueMemberId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseRemoteMembership(data: unknown): VfgMembershipLookupResult {
  if (!data || typeof data !== "object") return unverifiedMembership(new Date());
  const record = data as Record<string, unknown>;
  const statusRaw = typeof record.status === "string" ? record.status.trim().toLowerCase() : "";
  const activeFlag = record.active === true;
  const memberId = opaqueMemberId(record.memberId);
  const now = new Date();

  if (record.eligible === true) {
    return {
      verified: true,
      active: true,
      status: "active",
      memberId,
      verifiedAt: now,
    };
  }

  if (record.eligible === false) {
    return {
      verified: true,
      active: false,
      status: "inactive",
      memberId,
      verifiedAt: now,
    };
  }

  if (statusRaw === "active" || (activeFlag && statusRaw !== "inactive")) {
    return {
      verified: true,
      active: true,
      status: "active",
      memberId,
      verifiedAt: now,
    };
  }

  if (statusRaw === "inactive" || record.active === false) {
    return {
      verified: true,
      active: false,
      status: "inactive",
      memberId,
      verifiedAt: now,
    };
  }

  return unverifiedMembership(now);
}

export function isTrustedMembershipApiUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1")
    );
  } catch {
    return false;
  }
}

/** HTTP adapter for the VFG internal lookup API. Failures → unverified. */
export function createHttpVfgMembershipLookup(input: {
  url: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): VfgMembershipLookup {
  const timeoutMs = input.timeoutMs ?? 2500;
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    async lookup(identity) {
      if (!hasStrongIdentity(identity)) return unverifiedMembership(new Date());

      try {
        const email = normalizeMembershipEmail(identity.email);
        const phone = normalizeMembershipPhone(identity.phone);
        const body: Record<string, string> = {};
        if (email) body.email = email;
        if (phone) body.phone = phone;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetchImpl(input.url, {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              authorization: `Bearer ${input.apiKey}`,
              "x-vfg-membership-key": input.apiKey,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (!response.ok) return unverifiedMembership(new Date());
          const data: unknown = await response.json();
          return parseRemoteMembership(data);
        } finally {
          clearTimeout(timer);
        }
      } catch {
        return unverifiedMembership(new Date());
      }
    },
  };
}

export function getVfgMembershipLookup(): VfgMembershipLookup {
  const url = process.env.VFG_MEMBERSHIP_API_URL?.trim() ?? "";
  const apiKey = process.env.PT_MEMBERSHIP_API_KEY?.trim() ?? "";
  if (!url || !apiKey || !isTrustedMembershipApiUrl(url)) {
    return defaultUnverifiedVfgMembershipLookup;
  }
  try {
    return createHttpVfgMembershipLookup({ url, apiKey });
  } catch {
    return defaultUnverifiedVfgMembershipLookup;
  }
}

export async function lookupVfgMembership(
  identity: VfgMembershipIdentity,
  lookup: VfgMembershipLookup = getVfgMembershipLookup()
) {
  if (!hasStrongIdentity(identity)) return unverifiedMembership(new Date());
  try {
    return await lookup.lookup(identity);
  } catch {
    return unverifiedMembership(new Date());
  }
}
