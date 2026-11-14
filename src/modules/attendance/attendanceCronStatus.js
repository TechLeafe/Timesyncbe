const CRON_EXPRESSION = "0 22 * * *";
const TIMEZONE = "Asia/Kolkata";

const state = {
  scheduled: false,
  running: false,
  lastRunDay: null,
  lastRunStartedAt: null,
  lastRunFinishedAt: null,
  lastRunStatus: "not_run",
  lastRunTrigger: null,
  lastRunError: null,
};

const getTodayInIndia = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const markScheduled = () => {
  state.scheduled = true;
};

const markRunStarted = (
  day = getTodayInIndia(),
  trigger = "scheduled"
) => {
  state.running = true;
  state.lastRunDay = day;
  state.lastRunStartedAt = new Date().toISOString();
  state.lastRunStatus = "running";
  state.lastRunTrigger = trigger;
  state.lastRunError = null;
};

const markRunSucceeded = () => {
  state.running = false;
  state.lastRunFinishedAt = new Date().toISOString();
  state.lastRunStatus = "success";
  state.lastRunError = null;
};

const markRunFailed = (error) => {
  state.running = false;
  state.lastRunFinishedAt = new Date().toISOString();
  state.lastRunStatus = "failed";
  state.lastRunError =
    error instanceof Error ? error.message : String(error);
};

const getStatus = () => ({
  scheduled: state.scheduled,
  running: state.running,
  expression: CRON_EXPRESSION,
  timezone: TIMEZONE,
  nextScheduledTime: "10:00 PM daily",
  lastRunDay: state.lastRunDay,
  lastRunStartedAt: state.lastRunStartedAt,
  lastRunFinishedAt: state.lastRunFinishedAt,
  lastRunStatus: state.lastRunStatus,
  lastRunTrigger: state.lastRunTrigger,
  lastRunError: state.lastRunError,
});

module.exports = {
  markScheduled,
  markRunStarted,
  markRunSucceeded,
  markRunFailed,
  getStatus,
};
