const test = require("node:test");
const assert = require("node:assert/strict");
const Employee = require("../employees/employee.model");
const MonthlyAchievement = require("./monthlyAchievement.model");
const { saveAchievement } = require("./monthlyAchievement.service");

const pngDataUrl = `data:image/png;base64,${Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]).toString("base64")}`;

test("monthly achievement upload updates the selected employee photo", async () => {
  const originalFindOne = Employee.findOne;
  const originalFindOneAndUpdate = MonthlyAchievement.findOneAndUpdate;
  const employee = {
    _id: "employee-1",
    photo: null,
    save: async () => {},
  };
  Employee.findOne = async () => employee;
  MonthlyAchievement.findOneAndUpdate = () => ({
    populate: async () => ({
      employee,
      achievement: "Achievement",
    }),
  });

  try {
    await saveAchievement(
      {
        user_id: "employee-1",
        month: 11,
        year: 2026,
        achievement: "Achievement",
        photo: pngDataUrl,
      },
      "hr-1"
    );

    assert.equal(employee.photo, pngDataUrl);
  } finally {
    Employee.findOne = originalFindOne;
    MonthlyAchievement.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("monthly achievement rejects image data with an invalid signature", async () => {
  await assert.rejects(
    saveAchievement(
      {
        user_id: "employee-1",
        month: 11,
        year: 2026,
        achievement: "Achievement",
        photo: "data:image/png;base64,Zm9v",
      },
      "hr-1"
    ),
    /not a valid image/
  );
});
