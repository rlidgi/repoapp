const { db } = require('./firebaseAdmin');

const PLAN_LIMITS = {
  free: { daily: 3, monthly: 15 },
  pro100: { daily: Number.POSITIVE_INFINITY, monthly: 100 },
  pro200: { daily: Number.POSITIVE_INFINITY, monthly: 200 },
};

async function getUserPlan(uid) {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  const plan = snap.exists ? (snap.data().plan || 'free') : 'free';
  return plan;
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

async function checkAndIncrementUsage(uid, planId) {
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

module.exports = { PLAN_LIMITS, getUserPlan, checkAndIncrementUsage };


