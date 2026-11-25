
const nodemailer = require("nodemailer");
const Employee = require("../employees/employee.model");

// ======================================
// ALLOWED SUPPORT SUBJECTS
// ======================================

const ALLOWED_SUBJECTS = [
  "Attendance Issue",
  "Leave Request",
  "Payroll / Salary",
  "Permission Request",
  "Technical Support",
  "General HR Enquiry",
];

// ======================================
// HTML ESCAPE
// ======================================

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

// ======================================
// SMTP CONFIGURATION
// ======================================

const getSMTPConfig = () => {
  const config = {
    SMTP_HOST: process.env.SMTP_HOST?.trim(),
    SMTP_PORT: process.env.SMTP_PORT?.trim(),
    SMTP_USER: process.env.SMTP_USER?.trim(),
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM?.trim(),
    HR_SUPPORT_EMAIL: process.env.HR_SUPPORT_EMAIL?.trim(),
  };

  const missingEnv = Object.keys(config).filter(
    (key) => !config[key] || !String(config[key]).trim()
  );

  return {
    config,
    missingEnv,
  };
};

// ======================================
// SEND EMPLOYEE SUPPORT EMAIL
// ======================================

const sendSupportEmail = async (req, res) => {
  let transporter;

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

    // ======================================
    // EMPLOYEE AUTHENTICATION
    // ======================================

    const loggedInEmployeeId = req.user?.id;

    if (!loggedInEmployeeId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const employee = await Employee.findById(loggedInEmployeeId)
      .select("name employeeId email designation status")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (employee.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive.",
      });
    }

    if (!employee.email) {
      return res.status(400).json({
        success: false,
        message: "Employee email is not available.",
      });
    }

    // ======================================
    // VALIDATE SMTP CONFIGURATION
    // ======================================

    const { config, missingEnv } = getSMTPConfig();

    console.log("SMTP Configuration Status:", {
      SMTP_HOST: Boolean(config.SMTP_HOST),
      SMTP_PORT: Boolean(config.SMTP_PORT),
      SMTP_USER: Boolean(config.SMTP_USER),
      SMTP_PASSWORD: Boolean(config.SMTP_PASSWORD),
      SMTP_FROM: Boolean(config.SMTP_FROM),
      HR_SUPPORT_EMAIL: Boolean(config.HR_SUPPORT_EMAIL),
    });

    if (missingEnv.length > 0) {
      console.error(
        "Missing SMTP environment variables:",
        missingEnv.join(", ")
      );

      return res.status(503).json({
        success: false,
        code: "SMTP_NOT_CONFIGURED",
        message:
          "Support email service is not configured. Please contact the administrator.",
      });
    }

    const smtpPort = Number(config.SMTP_PORT);

    if (![465, 587].includes(smtpPort)) {
      console.error("Invalid SMTP port:", smtpPort);

      return res.status(503).json({
        success: false,
        code: "INVALID_SMTP_PORT",
        message: "Support email service configuration is invalid.",
      });
    }

    // ======================================
    // CREATE SMTP TRANSPORTER
    // ======================================

    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: smtpPort,

      secure: smtpPort === 465,
      requireTLS: smtpPort === 587,

      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },

      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,

      tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
      },
    });

    // ======================================
    // EMPLOYEE DETAILS
    // ======================================

    const employeeName = escapeHtml(employee.name);
    const employeeId = escapeHtml(employee.employeeId || "-");
    const employeeEmail = escapeHtml(employee.email);
    const designation = escapeHtml(employee.designation || "-");

    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message.trim());

    const requestDate = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // ======================================
    // EMAIL TEMPLATE
    // ======================================

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

    // ======================================
    // SEND EMAIL
    // ======================================

    const info = await transporter.sendMail({
      from: {
        name: `${employee.name} - TimeSync HRMS`,
        address: config.SMTP_FROM,
      },

      to: config.HR_SUPPORT_EMAIL,

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

    console.log("Support email accepted:", {
      messageId: info.messageId,
      acceptedCount: info.accepted?.length,
      rejectedCount: info.rejected?.length,
    });

    return res.status(200).json({
      success: true,
      message: "Your support request has been sent successfully.",
    });

  } catch (error) {

    // ======================================
    // ERROR HANDLING
    // ======================================

    console.error("Support email failed:", {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
    });

    // SMTP authentication error
    if (error.code === "EAUTH") {
      return res.status(503).json({
        success: false,
        code: "SMTP_AUTH_FAILED",
        message:
          "Support email authentication failed. Please contact HR.",
      });
    }

    // SMTP connection errors
    if (
      ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNREFUSED"].includes(
        error.code
      )
    ) {
      return res.status(503).json({
        success: false,
        code: "SMTP_CONNECTION_FAILED",
        message:
          "Unable to connect to the support email server. Please try again later.",
      });
    }

    // SMTP hostname error
    if (
      ["ENOTFOUND", "EDNS", "EAI_AGAIN"].includes(error.code)
    ) {
      return res.status(503).json({
        success: false,
        code: "SMTP_HOST_ERROR",
        message:
          "Support email server is unavailable. Please contact HR.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to send support email. Please contact HR.",
    });

  } finally {
    if (transporter) {
      transporter.close();
    }
  }
};

module.exports = {
  sendSupportEmail,
};
