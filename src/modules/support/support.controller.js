
const nodemailer = require("nodemailer");
const Employee = require("../employees/employee.model");

// Allowed support subjects
const ALLOWED_SUBJECTS = [
  "Attendance Issue",
  "Leave Request",
  "Payroll / Salary",
  "Permission Request",
  "Technical Support",
  "General HR Enquiry",
];

// Send employee support email
const sendSupportEmail = async (req, res) => {
  try {
    const { subject, message } = req.body || {};

    // Validate subject
    if (!subject || !ALLOWED_SUBJECTS.includes(subject)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid subject.",
      });
    }

    // Validate message
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your message.",
      });
    }

    if (message.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 5000 characters.",
      });
    }

    // Get logged-in employee ID from JWT
    const loggedInEmployeeId = req.user?.id;

    if (!loggedInEmployeeId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    // Fetch logged-in employee details
    const employee = await Employee.findById(loggedInEmployeeId)
      .select("name employeeId email designation status")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Check active employee
    if (employee.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive.",
      });
    }

    // Check employee email
    if (!employee.email) {
      return res.status(400).json({
        success: false,
        message: "Employee email is not available.",
      });
    }

    // Validate SMTP configuration
    const requiredEnv = [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "SMTP_FROM",
      "HR_SUPPORT_EMAIL",
    ];

    const missingEnv = requiredEnv.filter(
      (key) => !process.env[key]
    );

    if (missingEnv.length > 0) {
      console.error("Missing SMTP configuration:", missingEnv);

      return res.status(503).json({
        success: false,
        message: "Support email service is not configured.",
      });
    }

    const smtpPort = Number(process.env.SMTP_PORT);

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort !== 465,

      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Escape HTML to prevent HTML injection
    const escapeHtml = (value = "") =>
      String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char]));

    const employeeName = escapeHtml(employee.name);
    const employeeId = escapeHtml(employee.employeeId || "-");
    const employeeEmail = escapeHtml(employee.email);
    const designation = escapeHtml(employee.designation || "-");
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message.trim());

    // Request date and time
    const requestDate = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Email template
    const emailTemplate = `
      <div style="
        font-family: Arial, sans-serif;
        background-color: #f4f7fa;
        padding: 24px;
      ">
        <div style="
          max-width: 600px;
          margin: auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        ">

          <div style="
            background: #025B82;
            color: #ffffff;
            padding: 24px;
          ">
            <h2 style="margin: 0;">
              TimeSync HRMS
            </h2>

            <p style="margin: 8px 0 0;">
              Employee Support Request
            </p>
          </div>

          <div style="padding: 24px;">

            <h3 style="color: #025B82;">
              ${safeSubject}
            </h3>

            <p>Dear HR Team,</p>

            <p>
              A new support request has been submitted
              by an employee.
            </p>

            <table style="
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            ">

              <tr>
                <td style="padding: 10px; background: #f1f5f9;">
                  <strong>Employee Name</strong>
                </td>
                <td style="padding: 10px;">
                  ${employeeName}
                </td>
              </tr>

              <tr>
                <td style="padding: 10px; background: #f1f5f9;">
                  <strong>Employee ID</strong>
                </td>
                <td style="padding: 10px;">
                  ${employeeId}
                </td>
              </tr>

              <tr>
                <td style="padding: 10px; background: #f1f5f9;">
                  <strong>Employee Email</strong>
                </td>
                <td style="padding: 10px;">
                  ${employeeEmail}
                </td>
              </tr>

              <tr>
                <td style="padding: 10px; background: #f1f5f9;">
                  <strong>Designation</strong>
                </td>
                <td style="padding: 10px;">
                  ${designation}
                </td>
              </tr>

              <tr>
                <td style="padding: 10px; background: #f1f5f9;">
                  <strong>Request Date</strong>
                </td>
                <td style="padding: 10px;">
                  ${requestDate}
                </td>
              </tr>

            </table>

            <h3 style="color: #025B82; margin-top: 24px;">
              Employee Message
            </h3>

            <div style="
              background: #f8fafc;
              padding: 18px;
              border-radius: 8px;
              border-left: 4px solid #025B82;
              line-height: 1.7;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
            ">${safeMessage}</div>

            <p style="margin-top: 24px;">
              Regards,<br />
              <strong>${employeeName}</strong><br />
              ${designation}
            </p>

          </div>

          <div style="
            padding: 16px;
            background: #f1f5f9;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          ">
            This email was generated by TimeSync HRMS.
            Reply to this email to contact the employee.
          </div>

        </div>
      </div>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: {
        name: `${employee.name} - TimeSync HRMS`,
        address: process.env.SMTP_FROM,
      },

      // HR recipient
      to: process.env.HR_SUPPORT_EMAIL,

      // Dynamic logged-in employee email
      replyTo: employee.email,

      subject: `[TimeSync HRMS] ${subject}`,

      text: `
Employee Name: ${employee.name}
Employee ID: ${employee.employeeId || "-"}
Employee Email: ${employee.email}
Designation: ${employee.designation || "-"}
Request Date: ${requestDate}

Subject: ${subject}

Message:
${message.trim()}
      `,

      html: emailTemplate,
    });

    console.log("Support email accepted:", info.messageId);

    return res.status(200).json({
      success: true,
      message: "Your support request has been sent successfully.",
    });

  } catch (error) {
    console.error("Support email failed:", {
      code: error.code,
      message: error.message,
      response: error.response,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to send support email. Please contact HR.",
    });
  }
};

module.exports = {
  sendSupportEmail,
};
