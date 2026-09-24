// utils/rentDue.js
export function calcDue({ joiningDate, rents = [], baseRent = 0, now = new Date() }) {
  const base = Number(baseRent) || 0;
  if (!base || !joiningDate) return 0;

  // First rent month is the month *after* joining
  const anchor = new Date(new Date(joiningDate).getFullYear(), new Date(joiningDate).getMonth() + 1, 1);

  // Paid months set: "YYYY-M"
  const paid = new Set(
    (Array.isArray(rents) ? rents : [])
      .filter(r => r?.date && Number(r?.rentAmount) > 0)
      .map(r => {
        const d = new Date(r.date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
  );

  // count unpaid months from anchor up to current month (inclusive), stop at leave if any
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  let cur = new Date(anchor);
  let due = 0;
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${cur.getMonth()}`;
    if (!paid.has(key)) due += base;
    cur.setMonth(cur.getMonth() + 1);
  }
  return due;
}
