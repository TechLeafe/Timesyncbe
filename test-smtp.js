
require("dotenv").config();

const nodemailer = require("nodemailer");

async function testSMTP() {
  try {
    console.log("SMTP Host:", process.env.SMTP_HOST);
    console.log("SMTP Port:", process.env.SMTP_PORT);
    console.log("SMTP User:", process.env.SMTP_USER);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      requireTLS: true,

      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.verify();

    console.log("SMTP connection successful!");

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.HR_SUPPORT_EMAIL,
      subject: "TimeSync HRMS - SMTP Test",
      text: "Employee support email service test.",
    });

    console.log("Test email accepted:", info.messageId);

  } catch (error) {
    console.error("SMTP TEST FAILED");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Response:", error.response);
  }
}

testSMTP();
