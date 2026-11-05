const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getSuggestedAttendanceStatus,
  getPermissionCreditInfo,
  hasDailyFinalizationWindowOpened,
} = require("./attendance.service");

const makeAttendance = ({
  checkIn = "2026-11-02T09:00:00+05:30",
  checkOut,
  workingHours,
} = {}) => {
  const checkInTime = new Date(checkIn);
  const checkOutTime =
    checkOut === undefined
      ? new Date(checkInTime.getTime() + workingHours * 3600 * 1000)
      : checkOut
        ? new Date(checkOut)
        : null;

  return {
    day: "2026-11-02",
    checkInTime,
    checkOutTime,
    totalWorkingSeconds: workingHours * 3600,
  };
};

const getStatus = (attendance, permissionHours = 0) =>
  getSuggestedAttendanceStatus(
    attendance,
    attendance.checkOutTime,
    permissionHours
  );

test("nine hours of work is Present when no late or early exception applies", () => {
  assert.equal(getStatus(makeAttendance({ workingHours: 9 })), "Present");
});

test("working time is calculated from check-in and checkout rather than a stale total", () => {
  const attendance = makeAttendance({
    checkOut: "2026-11-02T14:00:00+05:30",
    workingHours: 9,
  });

  assert.equal(getStatus(attendance), "Absent");
});

test("attendance cannot qualify as Present or Half-Day Present without checkout", () => {
  const attendance = makeAttendance({
    checkOut: null,
    workingHours: 10,
  });

  assert.equal(getStatus(attendance), "Absent");
  assert.equal(
    getStatus(
      makeAttendance({
        checkIn: "2026-11-02T11:30:00+05:30",
        checkOut: null,
        workingHours: 10,
      })
    ),
    "Late Present"
  );
});

test("today cannot be finalized before 10 PM IST, but can at 10 PM", () => {
  assert.equal(
    hasDailyFinalizationWindowOpened(
      "2026-11-03",
      new Date("2026-11-03T16:29:59.000Z")
    ),
    false
  );
  assert.equal(
    hasDailyFinalizationWindowOpened(
      "2026-11-03",
      new Date("2026-11-03T16:30:00.000Z")
    ),
    true
  );
});

test("six hours with checkout is Half-Day Present", () => {
  assert.equal(
    getStatus(
      makeAttendance({
        checkIn: "2026-11-02T10:30:00+05:30",
        checkOut: "2026-11-02T16:30:00+05:30",
        workingHours: 6,
      })
    ),
    "Half-Day Present"
  );
});

test("under six hours is Absent unless the late-arrival rule applies", () => {
  assert.equal(
    getStatus(
      makeAttendance({
        checkIn: "2026-11-02T09:00:00+05:30",
        checkOut: "2026-11-02T14:00:00+05:30",
        workingHours: 5,
      })
    ),
    "Absent"
  );
  assert.equal(
    getStatus(
      makeAttendance({
        checkIn: "2026-11-02T11:30:00+05:30",
        checkOut: "2026-11-02T16:30:00+05:30",
        workingHours: 5,
      })
    ),
    "Late Present"
  );
});

test("late arrival remains Late Present without approved permission", () => {
  assert.equal(
    getStatus(
      makeAttendance({
        checkIn: "2026-11-02T11:30:00+05:30",
        checkOut: "2026-11-02T20:30:00+05:30",
        workingHours: 9,
      })
    ),
    "Late Present"
  );
});

test("approved permission bringing combined time to nine hours yields Present", () => {
  const examples = [
    { workingHours: 7, permissionHours: 2 },
    { workingHours: 8, permissionHours: 1 },
    { workingHours: 8.5, permissionHours: 0.5 },
  ];

  for (const { workingHours, permissionHours } of examples) {
    assert.equal(
      getStatus(
        makeAttendance({ workingHours }),
        permissionHours
      ),
      "Present"
    );
  }
});

test("permission credits only scheduled missed time and excludes actual work overlap", () => {
  const attendance = {
    day: "2026-11-02",
    checkInTime: new Date("2026-11-02T10:30:00+05:30"),
    checkOutTime: new Date("2026-11-02T17:30:00+05:30"),
    sessions: [
      {
        checkInTime: new Date("2026-11-02T10:30:00+05:30"),
        checkOutTime: new Date("2026-11-02T17:30:00+05:30"),
      },
    ],
  };
  const credit = getPermissionCreditInfo(
    attendance,
    [
      {
        status: "Approved",
        fromTime: "09:00",
        toTime: "11:00",
        totalHours: 2,
      },
    ],
    new Date("2026-11-02T18:00:00+05:30")
  );

  assert.equal(credit.requestedPermissionHours, 2);
  assert.equal(credit.approvedPermissionRequestedHours, 2);
  assert.equal(credit.approvedPermissionHours, 1.5);
});

test("pending or rejected permission is not credited toward attendance", () => {
  const attendance = makeAttendance({
    checkIn: "2026-11-02T09:30:00+05:30",
    workingHours: 7,
  });

  assert.equal(getStatus(attendance, 0), "Half-Day Present");
});

test("insufficient approved permission does not clear a late-arrival status", () => {
  assert.equal(
    getStatus(
      makeAttendance({
        checkIn: "2026-11-02T12:30:00+05:30",
        checkOut: "2026-11-02T19:30:00+05:30",
        workingHours: 7,
      }),
      1
    ),
    "Late Present"
  );
});

test("six to under nine hours with checkout is Half-Day Present", () => {
  const earlyCheckout = makeAttendance({
    checkIn: "2026-11-02T07:30:00+05:30",
    checkOut: "2026-11-02T16:00:00+05:30",
    workingHours: 8.5,
  });
  assert.equal(getStatus(earlyCheckout), "Half-Day Present");
  assert.equal(getStatus(earlyCheckout, 0.5), "Present");
});

test("permission outside the late-arrival gap does not clear Late Present", () => {
  const attendance = makeAttendance({
    checkIn: "2026-11-02T11:30:00+05:30",
    checkOut: "2026-11-02T19:30:00+05:30",
    workingHours: 8,
  });
  const credit = getPermissionCreditInfo(
    attendance,
    [
      {
        status: "Approved",
        fromTime: "09:00",
        toTime: "10:00",
        totalHours: 1,
      },
    ],
    attendance.checkOutTime
  );

  assert.equal(credit.approvedPermissionHours, 1);
  assert.equal(credit.lateArrivalUncoveredMinutes, 30);
  assert.equal(
    getSuggestedAttendanceStatus(
      attendance,
      attendance.checkOutTime,
      credit.approvedPermissionHours,
      credit.lateArrivalUncoveredMinutes
    ),
    "Late Present"
  );
});
