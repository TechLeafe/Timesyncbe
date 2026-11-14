const cron = require("node-cron");
const attendanceCronStatus = require("./attendanceCronStatus");
const { finalizeAttendanceForDay } = require("./attendance.service");

const TIMEZONE = "Asia/Kolkata";
const CRON_EXPRESSION = "0 22 * * *";

let activeRun = null;
let started = false;

const getIndiaDateParts = (now = new Date()) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

const getPart = (parts, type) =>
  parts.find((part) => part.type === type)?.value;

const getTodayInIndia = (parts = getIndiaDateParts()) =>
  `${getPart(parts, "year")}-${getPart(parts, "month")}-${getPart(parts, "day")}`;

const getPreviousDay = (day) => {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

const getDueDay = (now = new Date()) => {
  const parts = getIndiaDateParts(now);
  const today = getTodayInIndia(parts);
  return Number(getPart(parts, "hour")) >= 22
    ? today
    : getPreviousDay(today);
};

const runFinalization = async (day, trigger) => {
  if (activeRun) {
    if (activeRun.day === day) return activeRun.promise;
    await activeRun.promise;
    return runFinalization(day, trigger);
  }

  const status = attendanceCronStatus.getStatus();
  if (status.lastRunDay === day && status.lastRunStatus === "success") {
    return { day };
  }

  const promise = (async () => {
    attendanceCronStatus.markRunStarted(day, trigger);
    try {
      await finalizeAttendanceForDay(day);
      attendanceCronStatus.markRunSucceeded();
      console.log(`Attendance finalized for ${day} (${trigger})`);
      return { day };
    } catch (error) {
      attendanceCronStatus.markRunFailed(error);
      console.error(`Attendance finalization failed for ${day}:`, error.message);
      return { day, error };
    } finally {
      if (activeRun?.promise === promise) activeRun = null;
    }
  })();

  activeRun = { day, promise };
  return promise;
};

const ensureDueFinalization = () =>
  runFinalization(getDueDay(), "recovery");

const start = () => {
  if (started) return;
  started = true;

  cron.schedule(
    CRON_EXPRESSION,
    () => {
      void runFinalization(getTodayInIndia(), "scheduled");
    },
    { timezone: TIMEZONE }
  );

  cron.schedule(
    "* * * * *",
    () => {
      void ensureDueFinalization();
    },
    { timezone: TIMEZONE }
  );

  attendanceCronStatus.markScheduled();
  console.log("Attendance finalization scheduled daily at 10:00 PM IST");
};

module.exports = {
  ensureDueFinalization,
  getDueDay,
  start,
};
