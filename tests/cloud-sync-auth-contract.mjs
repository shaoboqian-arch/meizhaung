import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  inspectEditAccess,
  issueEditAccess,
  publicAccess,
  revokeEditAccess,
  rotateEditAccess
} = require("../cloudfunctions/meizhaung-sync/accessPolicy.js");

const issuedAt = new Date("2026-08-10T00:00:00.000Z");
const issued = issueEditAccess(issuedAt);
const document = { access: issued.access, accessAudit: [issued.auditEvent] };

assert.equal(inspectEditAccess(document, issued.credential, issuedAt).canEdit, true, "Valid local edit credential was rejected");
assert.equal(inspectEditAccess(document, undefined, issuedAt).kind, "missing-credential", "Code-only client retained write authority");
assert.equal(
  inspectEditAccess({}, "R9KHHE", issuedAt).kind,
  "legacy-read-only",
  "Legacy six-character code did not fail closed"
);
assert.equal(
  inspectEditAccess(document, issued.credential, new Date("2027-08-10T00:00:00.000Z")).kind,
  "expired",
  "Expired credential retained write authority"
);

const rotated = rotateEditAccess(document, issuedAt);
assert.equal(inspectEditAccess({ access: rotated.access }, issued.credential, issuedAt).canEdit, false, "Rotation did not revoke the old credential");
assert.equal(inspectEditAccess({ access: rotated.access }, rotated.credential, issuedAt).canEdit, true, "Rotated credential was not accepted");
assert.ok(rotated.accessAudit.some((event) => event.action === "edit-credential-rotated"), "Rotation was not audited");
assert.ok(!JSON.stringify(rotated.accessAudit).includes(rotated.credential), "Audit leaked the raw credential");

const revoked = revokeEditAccess({ access: rotated.access, accessAudit: rotated.accessAudit }, issuedAt);
assert.equal(inspectEditAccess({ access: revoked.access }, rotated.credential, issuedAt).kind, "revoked", "Revoked credential retained write authority");
assert.equal(publicAccess(inspectEditAccess({ access: revoked.access }, rotated.credential, issuedAt)).mode, "revoked");
console.log("Cloud sync auth contract passed.");
