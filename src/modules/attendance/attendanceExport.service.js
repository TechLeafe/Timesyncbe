const ExcelJS = require("exceljs");

async function generateAttendanceExcel(rows, leaveType = "ALL") {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Attendance Report");

  worksheet.columns = [
    { header: "Employee ID", key: "employeeId", width: 18 },
    { header: "Employee Name", key: "employeeName", width: 28 },
    { header: "Date", key: "date", width: 16 },
    { header: "Attendance Status", key: "attendanceStatus", width: 22 },
    { header: "Leave Type", key: "leaveType", width: 24 },
    ...(leaveType === "ALL" || leaveType === "PERMISSION"
      ? [{ header: "Permission Duration", key: "permissionDuration", width: 22 }]
      : []),
  ];

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF025B82" },
  };

  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
}

module.exports = { generateAttendanceExcel };
