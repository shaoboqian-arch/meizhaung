const crypto = require("crypto");

const ACCESS_SCHEMA_VERSION = 1;
const EDIT_CREDENTIAL_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const ACCESS_AUDIT_LIMIT = 40;

const hashEditCredential = (credential) =>
  crypto.createHash("sha256").update(String(credential || ""), "utf8").digest("hex");

const sameHash = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
};

const credentialFingerprint = (credentialHash) => credentialHash.slice(0, 12);

const appendAccessAudit = (audit, event) => [
  ...(Array.isArray(audit) ? audit : []),
  event
].slice(-ACCESS_AUDIT_LIMIT);

const issueEditAccess = (now = new Date()) => {
  const credential = crypto.randomBytes(32).toString("base64url");
  const credentialHash = hashEditCredential(credential);
  const expiresAt = new Date(now.getTime() + EDIT_CREDENTIAL_TTL_MS);
  return {
    credential,
    access: {
      schemaVersion: ACCESS_SCHEMA_VERSION,
      editCredentialHash: credentialHash,
      editCredentialExpiresAt: expiresAt,
      revokedAt: null
    },
    auditEvent: {
      at: now,
      action: "edit-credential-issued",
      credentialFingerprint: credentialFingerprint(credentialHash)
    }
  };
};

const inspectEditAccess = (document, credential, now = new Date()) => {
  const access = document?.access;
  if (!access || access.schemaVersion !== ACCESS_SCHEMA_VERSION || typeof access.editCredentialHash !== "string") {
    return { kind: "legacy-read-only", canEdit: false };
  }
  if (access.revokedAt) return { kind: "revoked", canEdit: false, access };
  const expiresAt = new Date(access.editCredentialExpiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return { kind: "expired", canEdit: false, access };
  }
  if (typeof credential !== "string" || credential.length < 32) {
    return { kind: "missing-credential", canEdit: false, access };
  }
  if (!sameHash(access.editCredentialHash, hashEditCredential(credential))) {
    return { kind: "invalid-credential", canEdit: false, access };
  }
  return { kind: "granted", canEdit: true, access };
};

const publicAccess = (inspection) => {
  const access = inspection.access;
  const expiry = access?.editCredentialExpiresAt ? new Date(access.editCredentialExpiresAt).toISOString() : undefined;
  const revokedAt = access?.revokedAt ? new Date(access.revokedAt).toISOString() : undefined;
  if (inspection.kind === "granted") return { canEdit: true, mode: "editor", editCredentialExpiresAt: expiry };
  if (inspection.kind === "expired") return { canEdit: false, mode: "expired", editCredentialExpiresAt: expiry };
  if (inspection.kind === "revoked") return { canEdit: false, mode: "revoked", revokedAt };
  if (inspection.kind === "legacy-read-only") return { canEdit: false, mode: "legacy-read-only" };
  return { canEdit: false, mode: "viewer", editCredentialExpiresAt: expiry };
};

const rotateEditAccess = (document, now = new Date()) => {
  const issued = issueEditAccess(now);
  return {
    credential: issued.credential,
    access: issued.access,
    accessAudit: appendAccessAudit(document?.accessAudit, {
      ...issued.auditEvent,
      action: "edit-credential-rotated"
    })
  };
};

const revokeEditAccess = (document, now = new Date()) => {
  const access = { ...document.access, revokedAt: now };
  return {
    access,
    accessAudit: appendAccessAudit(document?.accessAudit, {
      at: now,
      action: "edit-credential-revoked",
      credentialFingerprint: credentialFingerprint(access.editCredentialHash)
    })
  };
};

module.exports = {
  ACCESS_SCHEMA_VERSION,
  appendAccessAudit,
  hashEditCredential,
  inspectEditAccess,
  issueEditAccess,
  publicAccess,
  revokeEditAccess,
  rotateEditAccess
};
