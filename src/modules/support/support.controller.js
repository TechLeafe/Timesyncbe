const axios = require("axios");
const Employee = require("../employees/employee.model");

console.log("ZOHO MAIL CONTROLLER LOADED:", __filename);

/* ==========================================
   SUPPORT SUBJECTS
========================================== */

const SUPPORT_SUBJECTS = [
  "Attendance Issue",
  "Leave Request",
  "Payroll / Salary",
  "Permission Request",
  "Technical Support",
  "General HR Enquiry",
];

const MAX_MESSAGE_LENGTH = 5000;

/* ==========================================
   ZOHO TOKEN CACHE
========================================== */

let cachedAccessToken = null;
let tokenExpiresAt = 0;
let refreshPromise = null;

/* ==========================================
   ZOHO CONFIGURATION
========================================== */

const getZohoConfig = () => ({
  clientId: process.env.ZOHO_CLIENT_ID,
  clientSecret: process.env.ZOHO_CLIENT_SECRET,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
  accountId: process.env.ZOHO_ACCOUNT_ID,

  accountsUrl:
    process.env.ZOHO_ACCOUNTS_URL ||
    "https://accounts.zoho.in",

  mailUrl:
    process.env.ZOHO_MAIL_URL ||
    "https://mail.zoho.in",

  fromEmail: process.env.ZOHO_FROM_EMAIL,
  supportEmail: process.env.HR_SUPPORT_EMAIL,
});

/* ==========================================
   HTML ESCAPE
========================================== */

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/* ==========================================
   GENERATE ZOHO ACCESS TOKEN
========================================== */

const getZohoAccessToken = async (config) => {
  if (
    cachedAccessToken &&
    Date.now() < tokenExpiresAt
  ) {
    return cachedAccessToken;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const params = new URLSearchParams();

    params.append("client_id", config.clientId);
    params.append("client_secret", config.clientSecret);
    params.append("refresh_token", config.refreshToken);
    params.append("grant_type", "refresh_token");

    const response = await axios.post(
      `${config.accountsUrl}/oauth/v2/token`,
      params.toString(),
      {
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        timeout: 15000,
      }
    );

    const accessToken = response.data?.access_token;

    if (!accessToken) {
      const error = new Error(
        "Unable to generate Zoho access token."
      );

      error.code = "ZOHO_AUTH_FAILED";

      throw error;
    }

    cachedAccessToken = accessToken;

    const expiresIn =
      Number(response.data.expires_in) || 3600;

    tokenExpiresAt =
      Date.now() +
      Math.max(0, expiresIn - 60) * 1000;

    console.log(
      "Zoho access token generated successfully"
    );

    return cachedAccessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

/* ==========================================
   SEND SUPPORT EMAIL
========================================== */

const sendSupportEmail = async (req, res) => {
  console.log("ZOHO SUPPORT EMAIL API CALLED");

  let stage = "validation";

  try {
    /* ==========================================
       VALIDATE REQUEST
    ========================================== */

    const subject =
      typeof req.body?.subject === "string"
        ? req.body.subject.trim()
        : "";

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Please select a subject.",
      });
    }

    if (!SUPPORT_SUBJECTS.includes(subject)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support subject.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Please enter your message.",
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message:
          "Message cannot exceed 5000 characters.",
      });
    }

    /* ==========================================
       VALIDATE EMPLOYEE
    ========================================== */

    const employeeId =
      req.user?.id || req.user?._id;

    if (
      !employeeId ||
      !/^[a-fA-F0-9]{24}$/.test(String(employeeId))
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid employee session. Please login again.",
      });
    }

    stage = "employee";

    const employee = await Employee.findById(
      employeeId
    )
      .select(
        "name employeeId email designation status"
      )
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (
      String(employee.status).toLowerCase() !==
      "active"
    ) {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive.",
      });
    }

    /* ==========================================
       CHECK ZOHO CONFIGURATION
    ========================================== */

    stage = "configuration";

    const config = getZohoConfig();

    const requiredConfig = {
      ZOHO_CLIENT_ID: config.clientId,
      ZOHO_CLIENT_SECRET: config.clientSecret,
      ZOHO_REFRESH_TOKEN: config.refreshToken,
      ZOHO_ACCOUNT_ID: config.accountId,
      ZOHO_FROM_EMAIL: config.fromEmail,
      HR_SUPPORT_EMAIL: config.supportEmail,
    };

    const missingConfig = Object.entries(
      requiredConfig
    )
      .filter(([, value]) => !value?.trim())
      .map(([key]) => key);

    if (missingConfig.length > 0) {
      console.error(
        "Missing Zoho configuration:",
        missingConfig
      );

      return res.status(503).json({
        success: false,
        code: "ZOHO_NOT_CONFIGURED",
        message:
          "Support email service is not configured. Please contact the administrator.",
      });
    }

    /* ==========================================
       GENERATE ACCESS TOKEN
    ========================================== */

    stage = "authentication";

    const accessToken =
      await getZohoAccessToken(config);

    /* ==========================================
       EMPLOYEE DETAILS
    ========================================== */

    const employeeName = escapeHtml(
      employee.name || "Employee"
    );

    const employeeCode = escapeHtml(
      employee.employeeId || "N/A"
    );

    const employeeEmail = escapeHtml(
      employee.email || "N/A"
    );

    const designation = escapeHtml(
      employee.designation || "N/A"
    );

    const safeSubject = escapeHtml(subject);

    const safeMessage = escapeHtml(message)
      .replace(/\r\n|\r|\n/g, "<br />");

    const submittedAt = escapeHtml(
      new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    );

    /* ==========================================
       EMAIL TEMPLATE
    ========================================== */

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <body style="
        margin:0;
        padding:24px;
        background:#f4f7fa;
        font-family:Arial,sans-serif;
        color:#17263b;
      ">

        <div style="
          max-width:650px;
          margin:auto;
          background:#ffffff;
          border:1px solid #e2e8f0;
          border-radius:12px;
          overflow:hidden;
        ">

          <div style="
            background:#025B82;
            padding:24px;
            color:#ffffff;
          ">
            <h2 style="margin:0;">
              TimeSync HRMS
            </h2>

            <p style="margin:8px 0 0;">
              Employee Support Request
            </p>
          </div>

          <div style="padding:24px;">

            <h3 style="color:#025B82;">
              ${safeSubject}
            </h3>

            <p>Dear HR Team,</p>

            <p>
              A new employee support request
              has been submitted.
            </p>

            <table style="
              width:100%;
              border-collapse:collapse;
              font-size:14px;
            ">

              <tr>
                <td style="padding:10px;background:#f4f7fa;">
                  Employee Name
                </td>
                <td style="padding:10px;">
                  ${employeeName}
                </td>
              </tr>

              <tr>
                <td style="padding:10px;background:#f4f7fa;">
                  Employee ID
                </td>
                <td style="padding:10px;">
                  ${employeeCode}
                </td>
              </tr>

              <tr>
                <td style="padding:10px;background:#f4f7fa;">
                  Email Address
                </td>
                <td style="padding:10px;">
                  ${employeeEmail}
                </td>
              </tr>

              <tr>
                <td style="padding:10px;background:#f4f7fa;">
                  Designation
                </td>
                <td style="padding:10px;">
                  ${designation}
                </td>
              </tr>

              <tr>
                <td style="padding:10px;background:#f4f7fa;">
                  Subject
                </td>
                <td style="padding:10px;">
                  ${safeSubject}
                </td>
              </tr>

              <tr>
                <td style="padding:10px;background:#f4f7fa;">
                  Submitted At
                </td>
                <td style="padding:10px;">
                  ${submittedAt} IST
                </td>
              </tr>

            </table>

            <h3 style="
              margin-top:24px;
              color:#025B82;
            ">
              Employee Message
            </h3>

            <div style="
              padding:16px;
              background:#f4f7fa;
              border-left:4px solid #025B82;
              border-radius:6px;
              line-height:1.7;
              overflow-wrap:anywhere;
            ">
              ${safeMessage}
            </div>

            <p style="margin-top:24px;">
              Regards,<br />
              <strong>TimeSync HRMS</strong>
            </p>

          </div>

          <div style="
            padding:16px;
            background:#f4f7fa;
            text-align:center;
            font-size:12px;
            color:#64748b;
          ">
            This is an automated email from
            TimeSync HRMS Employee Support.
          </div>

        </div>

      </body>
      </html>
    `;

    /* ==========================================
       SEND EMAIL USING ZOHO HTTPS API
    ========================================== */

    stage = "send-email";

    const zohoApiUrl =
      `${config.mailUrl}/api/accounts/` +
      `${encodeURIComponent(config.accountId)}/messages`;

    const emailPayload = {
      fromAddress: config.fromEmail,
      toAddress: config.supportEmail,

      subject:
        `[TimeSync Support] ${subject} - ` +
        `${String(employee.name || "Employee")
          .replace(/[\r\n]/g, " ")}`,

      content: emailContent,
      mailFormat: "html",
      encoding: "UTF-8",
      askReceipt: "no",
    };

    console.log("Sending support email using Zoho API");

    const zohoResponse = await axios.post(
      zohoApiUrl,
      emailPayload,
      {
        headers: {
          Authorization:
            `Zoho-oauthtoken ${accessToken}`,

          "Content-Type": "application/json",
        },

        timeout: 20000,
      }
    );

    /* ==========================================
       VERIFY ZOHO RESPONSE
    ========================================== */

    if (
      Number(zohoResponse.data?.status?.code) !== 200
    ) {
      const error = new Error(
        "Zoho Mail rejected the email request."
      );

      error.code = "ZOHO_EMAIL_FAILED";

      throw error;
    }

    console.log(
      "Support email sent successfully"
    );

    /* ==========================================
       SUCCESS RESPONSE
    ========================================== */

    return res.status(200).json({
      success: true,
      message:
        "Support request sent successfully.",
    });

  } catch (error) {
    /* ==========================================
       ERROR HANDLING
    ========================================== */

    const status = error.response?.status;

    console.error("Support email error:", {
      stage,
      code: error.code,
      status,
    });

    if (
      stage === "authentication" ||
      error.code === "ZOHO_AUTH_FAILED" ||
      status === 401 ||
      status === 403
    ) {
      cachedAccessToken = null;
      tokenExpiresAt = 0;

      return res.status(503).json({
        success: false,
        code: "ZOHO_AUTH_FAILED",
        message:
          "Support email authentication failed. Please contact the administrator.",
      });
    }

    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      return res.status(504).json({
        success: false,
        code: "ZOHO_API_TIMEOUT",
        message:
          "Support email server timed out. Please try again later.",
      });
    }

    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ECONNRESET" ||
      error.code === "ENOTFOUND" ||
      error.code === "EAI_AGAIN"
    ) {
      return res.status(503).json({
        success: false,
        code: "ZOHO_CONNECTION_FAILED",
        message:
          "Unable to connect to the Zoho email server. Please try again later.",
      });
    }

    if (status === 429) {
      return res.status(429).json({
        success: false,
        code: "ZOHO_RATE_LIMIT",
        message:
          "Too many email requests. Please try again later.",
      });
    }

    return res.status(500).json({
      success: false,
      code: "ZOHO_EMAIL_FAILED",
      message:
        "Unable to send support request. Please try again later.",
    });
  }
};

/* ==========================================
   EXPORT CONTROLLER
========================================== */

module.exports = {
  sendSupportEmail,
};