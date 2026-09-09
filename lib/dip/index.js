import { createHash } from 'node:crypto';
export * from './types.js';
export const PROTOCOL_VERSION = '1.0.0-rc.1';
const forceRank = { CITE: 1, INFORM: 2, RECOMMEND: 3, CONSTRAIN: 4, AUTHORIZE_ACTION: 5, BIND_PARTY: 6, EXECUTE_IRREVERSIBLE: 7 };
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const stable = (x) => JSON.stringify(x, Object.keys(x).sort());
const nowISO = () => new Date().toISOString();
function halt(reason, stage, detail, objects = [], warrants = []) { return { reason, stage, detail, governingObjectIds: objects, governingWarrantIds: warrants }; }
export function admitSource(s) { if (!s?.id || !s.admitted)
    return { ok: false, halt: halt('MALFORMED_INPUT', 'SOURCE_ADMISSION', 'Source must exist and be explicitly admitted.', s?.id ? [s.id] : []) }; return { ok: true }; }
export function registerObject(source, obj) { if (obj.sourceRecordId !== source.id)
    return { ok: false, halt: halt('SOURCE_NOT_PRESERVED', 'OBJECT_IDENTITY', 'Object sourceRecordId does not match admitted source.', [obj.id, source.id]) }; if (obj.contentHash !== sha256(obj.exactContent))
    return { ok: false, halt: halt('SOURCE_NOT_PRESERVED', 'OBJECT_IDENTITY', 'contentHash does not bind exactContent.', [obj.id]) }; return { ok: true }; }
const qeq = (a, b) => stable(a) === stable(b);
export function propositionIntegrity(obj, p) { if (p.objectId !== obj.id)
    return { ok: false, halt: halt('COHERENT_SUBSTITUTION', 'PROPOSITION_ADMISSIBILITY', 'Proposition points to a different source object.', [obj.id, p.id]) }; if (!qeq(p.carriedQualifiers, obj.standing.Q))
    return { ok: false, halt: halt('QUALIFIER_STRIPPING', 'PROPOSITION_ADMISSIBILITY', 'Binding qualifiers changed or disappeared.', [obj.id, p.id]) }; if (p.totalizes)
    return { ok: false, halt: halt('UNSUPPORTED_TOTALIZATION', 'PROPOSITION_ADMISSIBILITY', 'Totalizing proposition requires separate warrant.', [p.id]) }; return { ok: true }; }
export function auditRelation(r, warrants) { if (!r.joinWarrantId)
    return { ok: false, halt: halt('UNSUPPORTED_JOIN', 'RELATION_JOIN_AUDIT', 'Relation has no independent join warrant.', [r.id]) }; if (!warrants.some(w => w.id === r.joinWarrantId && !w.revoked))
    return { ok: false, halt: halt('UNSUPPORTED_JOIN', 'RELATION_JOIN_AUDIT', 'Join warrant missing or revoked.', [r.id], [r.joinWarrantId]) }; return { ok: true }; }
export function computeDiff(a, b) { const ds = ['P', 'E', 'A', 'O', 'Q', 'T', 'V', 'J']; return ds.filter(d => !qeq(a[d], b[d])); }
export function validateWarrant(w, policy, t, dimension, at) { if (w.revoked)
    return 'Revoked warrant'; if (w.policyId !== policy.id || w.policyVersion !== policy.version || w.policyContentHash !== policy.contentHash || !policy.active)
    return 'Policy binding mismatch'; if (w.jurisdiction !== t.toStanding.J.jurisdiction)
    return 'Jurisdiction mismatch'; if (w.appliesToTarget !== t.toStanding.J.target)
    return 'Target mismatch'; if (!w.authorizesDimensions.includes(dimension))
    return 'Dimension not authorized'; if (w.expiresAt && new Date(w.expiresAt).getTime() < new Date(at).getTime())
    return 'Expired warrant'; return null; }
export function evaluateTransition(t, warrants, policies) {
    const halts = [];
    const changed = computeDiff(t.fromStanding, t.toStanding);
    if (t.fromStanding.V.supersededBy)
        halts.push(halt('SUPERSEDED_AUTHORITY', 'AUTHORITY_TRANSITION', 'Superseded state cannot govern a current transition.', [t.objectId]));
    if (t.fromStanding.J.jurisdiction !== t.toStanding.J.jurisdiction)
        halts.push(halt('JURISDICTION_MISMATCH', 'AUTHORITY_TRANSITION', 'Jurisdiction changed.', [t.objectId]));
    if (t.fromStanding.J.target !== t.toStanding.J.target)
        halts.push(halt('TARGET_TRANSFER', 'AUTHORITY_TRANSITION', 'Target changed.', [t.objectId]));
    if (t.fromStanding.Q.scope !== t.toStanding.Q.scope)
        halts.push(halt('SCOPE_TRANSFER', 'AUTHORITY_TRANSITION', 'Scope changed.', [t.objectId]));
    if (!qeq(t.fromStanding.Q, t.toStanding.Q) && changed.includes('Q')) {
        const oldQ = JSON.stringify(t.fromStanding.Q);
        const newQ = JSON.stringify(t.toStanding.Q);
        if (newQ.length < oldQ.length)
            halts.push(halt('QUALIFIER_STRIPPING', 'AUTHORITY_TRANSITION', 'Qualifiers were removed or weakened.', [t.objectId]));
    }
    for (const d of changed) {
        const diff = t.diffs.find(x => x.dimension === d && x.material);
        if (!diff?.citedWarrantId) {
            halts.push(halt('MISSING_WARRANT', 'WARRANT_VALIDATION', `Material ${d} transition has no warrant.`, [t.objectId]));
            continue;
        }
        const w = warrants.find(x => x.id === diff.citedWarrantId);
        if (!w) {
            halts.push(halt('INVALID_WARRANT', 'WARRANT_VALIDATION', `Warrant ${diff.citedWarrantId} not found.`, [t.objectId], [diff.citedWarrantId]));
            continue;
        }
        const p = policies.find(x => x.id === w.policyId);
        if (!p) {
            halts.push(halt('INVALID_WARRANT', 'WARRANT_VALIDATION', 'Referenced policy not found.', [t.objectId], [w.id]));
            continue;
        }
        const err = validateWarrant(w, p, t, d, t.proposedAt);
        if (err) {
            const reason = err === 'Expired warrant' ? 'EXPIRED_WARRANT' : err === 'Revoked warrant' ? 'REVOKED_WARRANT' : err === 'Jurisdiction mismatch' ? 'JURISDICTION_MISMATCH' : err === 'Target mismatch' ? 'TARGET_TRANSFER' : err === 'Dimension not authorized' ? 'WARRANT_DIMENSION_NOT_AUTHORIZED' : 'WARRANT_POLICY_MISMATCH';
            halts.push(halt(reason, 'WARRANT_VALIDATION', err, [t.objectId], [w.id]));
        }
    }
    return { ok: halts.length === 0, halts, changed };
}
export function evaluateForce(s, req, grant, warrants) { const halts = []; if (grant.revoked || grant.actorId !== req.actorId || grant.jurisdiction !== req.inJurisdiction || !grant.permittedOperations.includes(req.requestedForce))
    halts.push(halt('ACTOR_PERMISSION_MISSING', 'AUTHORIZED_FORCE', 'Actor permission does not authorize the requested force.', [grant.id])); if (s.J.target !== req.againstTarget)
    halts.push(halt('TARGET_TRANSFER', 'AUTHORIZED_FORCE', 'Requested target differs from standing target.')); if (s.J.jurisdiction !== req.inJurisdiction)
    halts.push(halt('JURISDICTION_MISMATCH', 'AUTHORIZED_FORCE', 'Requested jurisdiction differs from standing jurisdiction.')); if (s.T.validUntil && new Date(s.T.validUntil).getTime() < new Date(req.atTime).getTime())
    halts.push(halt('TEMPORAL_VALIDITY_EXPIRED', 'AUTHORIZED_FORCE', 'Standing is temporally expired.')); if (s.V.supersededBy)
    halts.push(halt('HISTORICAL_STATE_GOVERNING_CURRENT_ACTION', 'AUTHORIZED_FORCE', 'Superseded state cannot govern current action.')); const maxStanding = Math.max(0, ...s.O.map(x => forceRank[x])); if (forceRank[req.requestedForce] > maxStanding) {
    const actorAllowed = grant.permittedOperations.includes(req.requestedForce);
    halts.push(halt(actorAllowed ? 'ACTOR_PERMISSION_WITHOUT_INFORMATIONAL_AUTHORITY' : 'FORCE_EXCEEDED', 'AUTHORIZED_FORCE', 'Information lacks standing for requested force.', [], warrants.map(w => w.id)));
} return { ok: halts.length === 0, halts, granted: halts.length ? null : req.requestedForce }; }
export function evaluate(input) {
    const steps = [];
    const halts = [];
    const add = (stage, outcome, detail, objs = [], ws = []) => steps.push({ seq: steps.length + 1, stage, outcome, detail, governingObjectIds: objs, governingWarrantIds: ws });
    const s = admitSource(input.source);
    if (!s.ok) {
        halts.push(s.halt);
        add('SOURCE_ADMISSION', 'HALT', s.halt.detail);
        return finish();
    }
    ;
    add('SOURCE_ADMISSION', 'PASS', 'Source explicitly admitted.', [input.source.id]);
    const o = registerObject(input.source, input.object);
    if (!o.ok) {
        halts.push(o.halt);
        add('OBJECT_IDENTITY', 'HALT', o.halt.detail);
        return finish();
    }
    ;
    add('OBJECT_IDENTITY', 'PASS', 'Source identity and content digest preserved.', [input.object.id]);
    const p = propositionIntegrity(input.object, input.proposition);
    if (!p.ok) {
        halts.push(p.halt);
        add('PROPOSITION_ADMISSIBILITY', 'HALT', p.halt.detail);
        return finish();
    }
    ;
    add('PROPOSITION_ADMISSIBILITY', 'PASS', 'Proposition preserved source binding and qualifiers.', [input.proposition.id]);
    for (const r of input.relations) {
        const rr = auditRelation(r, input.warrants);
        if (!rr.ok) {
            halts.push(rr.halt);
            add('RELATION_JOIN_AUDIT', 'HALT', rr.halt.detail, [r.id]);
            return finish();
        }
    }
    add('RELATION_JOIN_AUDIT', 'PASS', 'All asserted joins independently warranted.', input.relations.map(r => r.id));
    const tr = evaluateTransition(input.transition, input.warrants, input.policies);
    if (!tr.ok) {
        halts.push(...tr.halts);
        add('AUTHORITY_TRANSITION', 'HALT', tr.halts.map(h => h.detail).join('; '), [input.transition.id]);
        return finish();
    }
    ;
    add('AUTHORITY_TRANSITION', 'PASS', 'All material standing deltas warranted.', [input.transition.id], input.transition.citedWarrantIds);
    const fr = evaluateForce(input.transition.toStanding, input.forceRequest, input.authorityGrant, input.warrants);
    if (!fr.ok) {
        halts.push(...fr.halts);
        add('AUTHORIZED_FORCE', 'HALT', fr.halts.map(h => h.detail).join('; '), [input.authorityGrant.id]);
        return finish();
    }
    ;
    add('AUTHORIZED_FORCE', 'PASS', 'Actor permission and informational authority both support requested force.', [input.authorityGrant.id]);
    if (input.domainGate && !input.domainGate.passed) {
        halts.push(halt('DOMAIN_GATE_FAILED', 'DOMAIN_GATE', input.domainGate.detail, [input.domainGate.id]));
        add('DOMAIN_GATE', 'HALT', input.domainGate.detail, [input.domainGate.id]);
        return finish();
    }
    add('DOMAIN_GATE', input.domainGate ? 'PASS' : 'SKIPPED', input.domainGate ? 'Domain gate passed.' : 'No domain gate supplied.');
    return finish(fr.granted ?? null);
    function finish(granted = null) { const resultClass = halts.length ? 'DENIED' : 'AUTHORIZED'; const inputDigest = sha256(JSON.stringify(input)); const resultDigest = sha256(JSON.stringify({ resultClass, halts, granted })); const trace = { id: `trace:${input.transition.id}`, protocolVersion: PROTOCOL_VERSION, steps, inputDigest, resultDigest }; return { id: `result:${input.transition.id}`, protocolVersion: PROTOCOL_VERSION, resultClass, grantedForce: granted, requestedForce: input.forceRequest.requestedForce, resultingStanding: halts.length ? null : input.transition.toStanding, halts, boundedConditions: [], residue: [], auditTrace: trace }; }
}
export function authorizeExecution(req, result) { return { id: `auth:${req.id}`, executionRequestId: req.id, transitionResultId: result.id, authorized: result.resultClass === 'AUTHORIZED' && result.grantedForce === req.operation, grantedForce: result.grantedForce, conditions: result.boundedConditions, issuedAt: nowISO() }; }
export function commitExecution(auth, priorState, newState, receipt) { if (!auth.authorized)
    throw new Error('STATE_MUTATION_AFTER_DENIAL'); if (!receipt)
    throw new Error('EXECUTION_WITHOUT_RECEIPT'); if (receipt.executionAuthorizationId !== auth.id)
    throw new Error('EXECUTION_WITHOUT_RECEIPT'); if (receipt.priorStateHash !== sha256(priorState) || receipt.committedStateHash !== sha256(newState))
    throw new Error('INVALID_RECEIPT'); const st = { id: `state:${receipt.id}`, receiptId: receipt.id, fromStateHash: receipt.priorStateHash, toStateHash: receipt.committedStateHash, appliedAt: receipt.committedAt }; return st; }
export function closeChamber(c) { const unresolved = c.openQuestions.filter(q => q.blocking && !q.resolved).map(q => q.id); if (unresolved.length)
    throw new Error('FALSE_CLOSURE'); return { id: `closure:${c.id}`, chamberId: c.id, structurallyClosed: true, unresolvedBlockingQuestionIds: [], residue: [], closedAt: nowISO() }; }
export function reopenChamber(c, authorized) { if (c.state !== 'CLOSED' || !authorized)
    throw new Error('UNAUTHORIZED_REOPENING'); return { ...c, state: 'REOPENED' }; }
