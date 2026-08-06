const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '465', 10);
const EMAIL_SECURE = process.env.EMAIL_SECURE !== 'false';
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'SmartPark';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';
const GMAIL_ACCESS_TOKEN = process.env.GMAIL_ACCESS_TOKEN || '';

let transporter = null;
let gmailAuthClient = null;

function getTransporter() {
  if (!EMAIL_USER || !EMAIL_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }
  return transporter;
}

function getGmailClient() {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    return null;
  }
  if (!gmailAuthClient) {
    gmailAuthClient = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    gmailAuthClient.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN, access_token: GMAIL_ACCESS_TOKEN || undefined });
  }
  return gmailAuthClient;
}

async function sendViaGmail({ to, subject, html, text }) {
  const client = getGmailClient();
  if (!client) {
    return { skipped: true, reason: 'Gmail API not configured' };
  }
  try {
    const gmail = google.gmail({ version: 'v1', auth: client });
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = ['From: ' + `"${EMAIL_FROM_NAME}" <${EMAIL_FROM || ''}>`];
    messageParts.push('To: ' + to);
    messageParts.push('Subject: ' + utf8Subject);
    messageParts.push('MIME-Version: 1.0');
    messageParts.push('Content-Type: text/html; charset=utf-8');
    messageParts.push('');
    messageParts.push(html || text || '');

    const encodedMessage = Buffer.from(messageParts.join('\r\n')).toString('base64url');
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    return { skipped: false, messageId: res.data.id };
  } catch (err) {
    console.error('Gmail API send error:', err && err.message ? err.message : err);
    return { skipped: false, error: err && err.message ? err.message : String(err) };
  }
}

function buildBookingConfirmationEmail({ to, customerName, vehicle, vehicleType, zone, slot, date, entryTime, durationHours, bookingType, cost, paymentMethod, customerNumber, trxId, status }) {
  const subject = `Booking Confirmed: ${zone} - ${slot}`;
  const isMeter = bookingType === 'meter';
  const body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#111b33;border-radius:16px;overflow:hidden;border:1px solid #1e2d4a;">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#10b981);padding:20px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0.5px;">SmartPark</h1>
              <p style="margin:4px 0 0;color:#e2e8f0;font-size:12px;font-weight:500;">Booking Confirmation</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;color:#e2e8f0;font-size:14px;">Hi ${customerName || 'Customer'},</p>
              <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;">Your parking booking has been confirmed. Here are your booking details:</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1426;border-radius:12px;padding:16px;border:1px solid #1e2d4a;">
                <tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Zone:</strong> ${zone}</td></tr>
                <tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Slot:</strong> ${slot}</td></tr>
                <tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Vehicle:</strong> ${vehicle} (${vehicleType || 'N/A'})</td></tr>
                <tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Date:</strong> ${date || '-'}</td></tr>
                <tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Entry Time:</strong> ${entryTime || '-'}</td></tr>
                <tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Booking Type:</strong> ${isMeter ? 'Metered (Pay on exit)' : 'Fixed Duration (' + (durationHours || 1) + ' hr)'}</td></tr>
                <tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Amount:</strong> <span style="color:#10b981;font-weight:700;">৳${Number(cost || 0).toFixed(2)}</span></td></tr>
                <tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Payment Method:</strong> ${paymentMethod || '-'}</td></tr>
                ${customerNumber ? '<tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Mobile Number:</strong> ' + customerNumber + '</td></tr>' : ''}
                ${trxId ? '<tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">TrxID:</strong> ' + trxId + '</td></tr>' : ''}
                <tr><td style="padding:6px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#e2e8f0;">Status:</strong> ' + (status === 'Active' ? '<span style="color:#3b82f6;font-weight:700;">Active</span>' : status || 'Active') + '</td></tr>
              </table>
              <p style="margin:16px 0 0;color:#64748b;font-size:11px;">If you did not make this booking, please contact support immediately.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;text-align:center;border-top:1px solid #1e2d4a;">
              <p style="margin:0;color:#475569;font-size:11px;">&copy; ${new Date().getFullYear()} SmartPark. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { to, subject, html: body };
}

function buildWelcomeEmail({ to, customerName }) {
  const subject = 'Welcome to SmartPark!';
  const body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SmartPark</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#111b33;border-radius:16px;overflow:hidden;border:1px solid #1e2d4a;">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#10b981);padding:20px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0.5px;">SmartPark</h1>
              <p style="margin:4px 0 0;color:#e2e8f0;font-size:12px;font-weight:500;">Welcome Aboard</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;color:#e2e8f0;font-size:14px;">Hi ${customerName || 'there'},</p>
              <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;">Thank you for joining SmartPark. We make parking simple, fast, and smart.</p>
              <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;">You can now book parking slots, track sessions, and manage payments directly from your dashboard.</p>
              <p style="margin:0;color:#64748b;font-size:11px;">Need help? Reply to this email or visit our support page.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;text-align:center;border-top:1px solid #1e2d4a;">
              <p style="margin:0;color:#475569;font-size:11px;">&copy; ${new Date().getFullYear()} SmartPark. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { to, subject, html: body };
}

async function sendMail({ to, subject, html, text }) {
  const useGmailApi = GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN;
  if (useGmailApi) {
    const result = await sendViaGmail({ to, subject, html, text });
    if (!result.skipped) return result;
  }
  const t = getTransporter();
  if (!t) {
    return { skipped: true, reason: 'Email transport not configured. Set EMAIL_USER/EMAIL_PASS or Gmail API credentials.' };
  }
  try {
    const info = await t.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to,
      subject,
      text: text || subject,
      html,
    });
    return { skipped: false, messageId: info.messageId };
  } catch (err) {
    console.error('Email send error:', err && err.message ? err.message : err);
    return { skipped: false, error: err && err.message ? err.message : String(err) };
  }
}

async function sendBookingConfirmation(to, booking) {
  const payload = buildBookingConfirmationEmail({
    to,
    customerName: booking.name || booking.customerName,
    vehicle: booking.vehicle || booking.plateNumber,
    vehicleType: booking.vehicleType,
    zone: booking.zone,
    slot: booking.slot,
    date: booking.date,
    entryTime: booking.entryTime,
    durationHours: booking.durationHours,
    bookingType: booking.bookingType,
    cost: booking.cost,
    paymentMethod: booking.paymentMethod || booking.payment,
    customerNumber: booking.customerNumber,
    trxId: booking.trxId,
    status: booking.status,
  });
  return sendMail(payload);
}

async function sendWelcomeEmail(to, customerName) {
  const payload = buildWelcomeEmail({ to, customerName });
  return sendMail(payload);
}

module.exports = {
  sendMail,
  sendBookingConfirmation,
  sendWelcomeEmail,
  getTransporter,
  getGmailClient,
  sendViaGmail,
};
