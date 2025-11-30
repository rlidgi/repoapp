import { db } from '../firebaseAdmin.js';

export const PLAN_LIMITS = {
  free: { daily: 3, monthly: 15 },
  pro100: { daily: Infinity, monthly: 100 },
  pro200: { daily: Infinity, monthly: 200 },
};

export async function getUserPlan(uid) {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  const plan = snap.exists ? (snap.data().plan || 'free') : 'free';
  return plan;
}

export async function setUserPlan(uid, planId) {
  const ref = db.collection('users').doc(uid);
  await ref.set({ plan: planId, updatedAt: new Date() }, { merge: true });
}

function monthKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function dayKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function checkAndIncrementUsage(uid, planId) {
  const limits = PLAN_LIMITS[planId] || PLAN_LIMITS.free;
  const mKey = monthKey();
  const dKey = dayKey();
  const usageRef = db.collection('usage').doc(`${uid}-${mKey}`);
  let allowed = false;
  let after = { monthly: 0, daily: 0 };
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    const data = snap.exists ? snap.data() : { monthly: 0, daily: {} };
    const monthly = data.monthly || 0;
    const daily = data.daily || {};
    const todays = daily[dKey] || 0;
    const nextMonthly = monthly + 1;
    const nextTodays = todays + 1;
    if ((Number.isFinite(limits.monthly) && nextMonthly > limits.monthly) ||
        (Number.isFinite(limits.daily) && nextTodays > limits.daily)) {
      allowed = false;
      return;
    }
    allowed = true;
    daily[dKey] = nextTodays;
    tx.set(usageRef, { monthly: nextMonthly, daily, updatedAt: new Date() }, { merge: true });
    after = { monthly: nextMonthly, daily: nextTodays };
  });
  return { allowed, after, limits };
}


