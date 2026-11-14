const test = require("node:test");
const assert = require("node:assert/strict");
const validateLeaveApply = require("./leaveApply.validation");
const validateLeavePolicy = require("../leaves/leave.validation");

const validatePermission = (durationMinutes) => {
  const startMinutes = 9 * 60;
  const endMinutes = startMinutes + durationMinutes;
  const time = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
      minutes % 60
    ).padStart(2, "0")}`;

  return validateLeaveApply({
    leaveType: "PERMISSION",
    fromDate: "2026-11-04",
    fromTime: time(startMinutes),
    toTime: time(endMinutes),
    reason: "Personal appointment",
  });
};

test("only the four supported permission durations are accepted", () => {
  for (const durationMinutes of [30, 60, 90, 120]) {
    assert.equal(validatePermission(durationMinutes).isValid, true);
  }
});

test("permission durations outside the supported options are rejected", () => {
  for (const durationMinutes of [15, 45, 150, 180, 210, 240, 270]) {
    const result = validatePermission(durationMinutes);
    assert.equal(result.isValid, false);
    assert.match(result.errors.toTime, /30 minutes, 1 hour, 1.5 hours, or 2 hours/);
  }
});

test("leave policy permission allowance is fixed at four hours", () => {
  const policy = {
    policyName: "Employee Leave",
    businessYear: "2026-2027",
    casualLeave: 11,
    sickLeave: 12,
    compensatoryOff: 0,
    permissionsPerMonth: 4,
  };

  assert.equal(validateLeavePolicy(policy).isValid, true);
  assert.equal(
    validateLeavePolicy({ ...policy, permissionsPerMonth: 2 }).isValid,
    false
  );
});
