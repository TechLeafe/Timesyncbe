const test = require("node:test");
const assert = require("node:assert/strict");
const { getDueDay } = require("./attendanceScheduler");

test("recovery targets the previous day before 10 PM IST", () => {
  assert.equal(
    getDueDay(new Date("2026-11-03T16:29:59.000Z")),
    "2026-11-02"
  );
});

test("recovery targets the current day at and after 10 PM IST", () => {
  assert.equal(
    getDueDay(new Date("2026-11-03T16:30:00.000Z")),
    "2026-11-03"
  );
});
