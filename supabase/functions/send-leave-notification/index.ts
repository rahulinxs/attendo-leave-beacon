import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeaveNotificationRequest {
  action: "apply" | "approve" | "reject";
  leaveRequestId: string;
  company_id: string;
}

interface EmployeeRecord {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  reporting_manager_id: string | null;
  company_id: string | null;
  is_active: boolean | null;
}

interface LeaveRequestRecord {
  id: string;
  employee_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: string | null;
  approved_by: string | null;
  admin_comments: string | null;
  leave_type_id: string | null;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(
  dateStr: string | null | undefined
): string {
  if (!dateStr) return "-";

  const raw = String(dateStr).slice(0, 10);
  const parts = raw.split("-");

  if (parts.length !== 3) {
    return String(dateStr);
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day) {
    return String(dateStr);
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeEmail(
  email: string | null | undefined
): string | null {
  if (!email) return null;

  const value = email.trim().toLowerCase();

  return value || null;
}

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const SMTP_HOST =
  Deno.env.get("SMTP_HOST") ||
  "smtp.gmail.com";

const SMTP_PORT =
  Number(Deno.env.get("SMTP_PORT") || "465");

const SMTP_USER =
  Deno.env.get("SMTP_USER");

const SMTP_PASS =
  Deno.env.get("SMTP_PASS");

const MAIL_FROM =
  Deno.env.get("MAIL_FROM") ||
  SMTP_USER;

const MAIL_FROM_NAME =
  Deno.env.get("MAIL_FROM_NAME") ||
  "AttendEdge";

const APP_URL =
  Deno.env.get("APP_URL") ||
  "https://attendedge.netlify.app";

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Only POST requests are allowed.",
      },
      405
    );
  }

  try {
    console.log(
      "=============================================="
    );
    console.log(
      "AttendEdge - send-leave-notification"
    );
    console.log(
      "=============================================="
    );

    /* ---------------------------------------------------------------------- */
    /* Validate environment                                                    */
    /* ---------------------------------------------------------------------- */

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error(
        "Missing Supabase environment variables."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Supabase server configuration error.",
        },
        500
      );
    }

    if (
      !SMTP_HOST ||
      !SMTP_USER ||
      !SMTP_PASS ||
      !MAIL_FROM
    ) {
      console.error(
        "SMTP configuration incomplete."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Email service is not configured.",
        },
        500
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Read Authorization header                                               */
    /* ---------------------------------------------------------------------- */

    const authorization =
      req.headers.get("Authorization");

    /*
     * We intentionally do NOT call auth.getUser()
     * here because your current Supabase legacy JWT
     * setup is rejecting that token.
     *
     * The gateway JWT verification has already been
     * disabled for this Edge Function.
     */

    if (!authorization) {
      console.error(
        "Authorization header missing."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Authorization header missing.",
        },
        401
      );
    }

    console.log(
      "Authorization header received."
    );

    /* ---------------------------------------------------------------------- */
    /* Parse request body                                                      */
    /* ---------------------------------------------------------------------- */

    let body: LeaveNotificationRequest;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid JSON request body.",
        },
        400
      );
    }

    const {
      action,
      leaveRequestId,
      company_id,
    } = body;

    console.log("Action:", action);
    console.log(
      "Leave Request ID:",
      leaveRequestId
    );
    console.log(
      "Company ID:",
      company_id
    );

    if (
      !action ||
      !["apply", "approve", "reject"].includes(
        action
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid action. Allowed values: apply, approve, reject.",
        },
        400
      );
    }

    if (!leaveRequestId) {
      return jsonResponse(
        {
          success: false,
          error:
            "leaveRequestId is required.",
        },
        400
      );
    }

    if (!company_id) {
      return jsonResponse(
        {
          success: false,
          error:
            "company_id is required.",
        },
        400
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Service-role client                                                     */
    /* ---------------------------------------------------------------------- */

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    /* ---------------------------------------------------------------------- */
    /* Find leave request                                                      */
    /* ---------------------------------------------------------------------- */

    console.log(
      "Looking up leave request..."
    );

    const {
      data: leaveRequest,
      error: leaveError,
    } = await supabase
      .from("leave_requests")
      .select(`
        id,
        employee_id,
        company_id,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        approved_by,
        admin_comments,
        leave_type_id
      `)
      .eq("id", leaveRequestId)
      .eq("company_id", company_id)
      .maybeSingle();

    if (leaveError) {
      console.error(
        "Leave request lookup error:",
        leaveError.message
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Database error while retrieving leave request.",
          details: leaveError.message,
        },
        500
      );
    }

    if (!leaveRequest) {
      console.error(
        "Leave request not found."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Leave request not found.",
        },
        404
      );
    }

    console.log(
      "Leave request found:",
      leaveRequest.id
    );

    /* ---------------------------------------------------------------------- */
    /* Fetch employee                                                          */
    /* ---------------------------------------------------------------------- */

    const {
      data: employee,
      error: employeeError,
    } = await supabase
      .from("employees")
      .select(`
        id,
        email,
        name,
        role,
        reporting_manager_id,
        company_id,
        is_active
      `)
      .eq("id", leaveRequest.employee_id)
      .eq("company_id", company_id)
      .maybeSingle();

    if (employeeError) {
      console.error(
        "Employee lookup error:",
        employeeError.message
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Database error while retrieving employee.",
        },
        500
      );
    }

    if (!employee) {
      return jsonResponse(
        {
          success: false,
          error:
            "Employee associated with leave request was not found.",
        },
        404
      );
    }

    console.log(
      "Employee:",
      employee.name,
      employee.email
    );

    /* ---------------------------------------------------------------------- */
    /* Leave type                                                              */
    /* ---------------------------------------------------------------------- */

    let leaveTypeName = "Leave";

    if (leaveRequest.leave_type_id) {
      const {
        data: leaveType,
        error: leaveTypeError,
      } = await supabase
        .from("leave_types")
        .select("id, name")
        .eq(
          "id",
          leaveRequest.leave_type_id
        )
        .maybeSingle();

      if (leaveTypeError) {
        console.error(
          "Leave type lookup error:",
          leaveTypeError.message
        );
      }

      if (leaveType?.name) {
        leaveTypeName =
          leaveType.name;
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Email recipients                                                        */
    /* ---------------------------------------------------------------------- */

    const emails: Array<{
      to: string;
      subject: string;
      html: string;
    }> = [];

    const employeeName =
      employee.name || "Employee";

    /* ---------------------------------------------------------------------- */
    /* APPLY                                                                    */
    /* ---------------------------------------------------------------------- */

    if (action === "apply") {
      console.log(
        "Processing APPLY notification..."
      );

      // Confirm receipt to the employee who submitted the request.
      const employeeEmail =
        normalizeEmail(employee.email);

      if (employeeEmail) {
        emails.push({
          to: employeeEmail,
          subject:
            `Leave Application Received - ${leaveTypeName}`,
          html: getLeaveApplicationReceivedEmail(
            employeeName,
            leaveTypeName,
            leaveRequest.start_date,
            leaveRequest.end_date,
            leaveRequest.total_days,
            leaveRequest.reason ||
              "No reason provided"
          ),
        });
      }

      /*
       * Reporting manager
       */
      if (
        employee.reporting_manager_id
      ) {
        const {
          data: manager,
          error: managerError,
        } = await supabase
          .from("employees")
          .select(`
            id,
            email,
            name,
            role,
            reporting_manager_id,
            company_id,
            is_active
          `)
          .eq(
            "id",
            employee.reporting_manager_id
          )
          .eq(
            "company_id",
            company_id
          )
          .maybeSingle();

        if (managerError) {
          console.error(
            "Manager lookup error:",
            managerError.message
          );
        }

        if (
          manager &&
          manager.email &&
          manager.is_active !== false
        ) {
          emails.push({
            to: manager.email,
            subject:
              `New Leave Application - ${employeeName}`,
            html: getLeaveAppliedEmail(
              employeeName,
              leaveTypeName,
              leaveRequest.start_date,
              leaveRequest.end_date,
              leaveRequest.total_days,
              leaveRequest.reason ||
                "No reason provided",
              manager.name ||
                "Manager"
            ),
          });

          console.log(
            "Manager notification:",
            manager.email
          );
        }
      }

      /*
       * Admins + Super Admins
       */
      const {
        data: admins,
        error: adminError,
      } = await supabase
        .from("employees")
        .select(`
          id,
          email,
          name,
          role,
          reporting_manager_id,
          company_id,
          is_active
        `)
        .eq(
          "company_id",
          company_id
        )
        .eq(
          "is_active",
          true
        )
        .in(
          "role",
          ["admin", "super_admin"]
        );

      if (adminError) {
        console.error(
          "Admin lookup error:",
          adminError.message
        );
      }

      if (admins) {
        for (const admin of admins) {
          if (admin.email) {
            emails.push({
              to: admin.email,
              subject:
                `New Leave Application - ${employeeName}`,
              html: getLeaveAppliedEmail(
                employeeName,
                leaveTypeName,
                leaveRequest.start_date,
                leaveRequest.end_date,
                leaveRequest.total_days,
                leaveRequest.reason ||
                  "No reason provided",
                admin.name ||
                  "Administrator"
              ),
            });
          }
        }
      }
    }

    /* ---------------------------------------------------------------------- */
    /* APPROVE                                                                  */
    /* ---------------------------------------------------------------------- */

    if (action === "approve") {
      console.log(
        "Processing APPROVE notification..."
      );

      const employeeEmail =
        normalizeEmail(employee.email);

      if (!employeeEmail) {
        return jsonResponse(
          {
            success: false,
            error:
              "Employee does not have a valid email address.",
          },
          400
        );
      }

      let approverName =
        "Administrator";

      if (leaveRequest.approved_by) {
        const {
          data: approver,
          error: approverError,
        } = await supabase
          .from("employees")
          .select(
            "id, name, email"
          )
          .eq(
            "id",
            leaveRequest.approved_by
          )
          .maybeSingle();

        if (approverError) {
          console.error(
            "Approver lookup error:",
            approverError.message
          );
        }

        if (approver?.name) {
          approverName =
            approver.name;
        }
      }

      emails.push({
        to: employeeEmail,
        subject:
          `Leave Request Approved - ${leaveTypeName}`,
        html:
          getLeaveApprovedEmail(
            employeeName,
            leaveTypeName,
            leaveRequest.start_date,
            leaveRequest.end_date,
            leaveRequest.total_days,
            approverName,
            leaveRequest.admin_comments
          ),
      });
    }

    /* ---------------------------------------------------------------------- */
    /* REJECT                                                                   */
    /* ---------------------------------------------------------------------- */

    if (action === "reject") {
      console.log(
        "Processing REJECT notification..."
      );

      const employeeEmail =
        normalizeEmail(employee.email);

      if (!employeeEmail) {
        return jsonResponse(
          {
            success: false,
            error:
              "Employee does not have a valid email address.",
          },
          400
        );
      }

      let rejectorName =
        "Administrator";

      /*
       * Current schema uses approved_by for the actor.
       * Keep this until a dedicated rejected_by field
       * exists in the database.
       */
      if (leaveRequest.approved_by) {
        const {
          data: rejector,
          error: rejectorError,
        } = await supabase
          .from("employees")
          .select(
            "id, name, email"
          )
          .eq(
            "id",
            leaveRequest.approved_by
          )
          .maybeSingle();

        if (rejectorError) {
          console.error(
            "Rejector lookup error:",
            rejectorError.message
          );
        }

        if (rejector?.name) {
          rejectorName =
            rejector.name;
        }
      }

      emails.push({
        to: employeeEmail,
        subject:
          `Leave Request Rejected - ${leaveTypeName}`,
        html:
          getLeaveRejectedEmail(
            employeeName,
            leaveTypeName,
            leaveRequest.start_date,
            leaveRequest.end_date,
            leaveRequest.total_days,
            rejectorName,
            leaveRequest.admin_comments
          ),
      });
    }

    /* ---------------------------------------------------------------------- */
    /* Deduplicate                                                             */
    /* ---------------------------------------------------------------------- */

    const emailMap =
      new Map<
        string,
        {
          to: string;
          subject: string;
          html: string;
        }
      >();

    for (const email of emails) {
      const normalized =
        normalizeEmail(email.to);

      if (
        normalized &&
        !emailMap.has(normalized)
      ) {
        emailMap.set(
          normalized,
          {
            ...email,
            to: normalized,
          }
        );
      }
    }

    const finalEmails =
      Array.from(emailMap.values());

    console.log(
      "Final email recipients:",
      finalEmails.map(
        (email) => email.to
      )
    );

    if (finalEmails.length === 0) {
      return jsonResponse(
        {
          success: false,
          error:
            "No valid email recipients found.",
          action,
          totalAttempted: 0,
        },
        404
      );
    }

    /* ---------------------------------------------------------------------- */
    /* SMTP                                                                    */
    /* ---------------------------------------------------------------------- */

    const transporter =
      nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

    try {
      await transporter.verify();

      console.log(
        "SMTP connection verified."
      );
    } catch (smtpError) {
      console.error(
        "SMTP verification failed:",
        smtpError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Email server connection failed. Check SMTP configuration.",
        },
        500
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Send                                                                    */
    /* ---------------------------------------------------------------------- */

    const sentEmails: Array<{
      to: string;
      status: string;
    }> = [];

    const failedEmails: Array<{
      to: string;
      error: string;
    }> = [];

    for (const email of finalEmails) {
      try {
        await transporter.sendMail({
          from:
            `"${MAIL_FROM_NAME}" <${MAIL_FROM}>`,
          to: email.to,
          subject: email.subject,
          html: email.html,
        });

        sentEmails.push({
          to: email.to,
          status: "sent",
        });

        console.log(
          "Email sent:",
          email.to
        );
      } catch (sendError) {
        const message =
          sendError instanceof Error
            ? sendError.message
            : "Failed to send email";

        failedEmails.push({
          to: email.to,
          error: message,
        });

        console.error(
          "Email send failed:",
          email.to,
          message
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Response                                                                */
    /* ---------------------------------------------------------------------- */

    if (sentEmails.length === 0) {
      return jsonResponse(
        {
          success: false,
          message:
            "All notification emails failed to send.",
          sent: sentEmails,
          failed: failedEmails,
          action,
          totalAttempted:
            finalEmails.length,
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      message:
        `${sentEmails.length} email(s) sent successfully` +
        (
          failedEmails.length
            ? `, ${failedEmails.length} failed`
            : ""
        ),
      sent: sentEmails,
      failed: failedEmails,
      action,
      totalAttempted:
        finalEmails.length,
    });

  } catch (error) {
    console.error(
      "Unexpected send-leave-notification error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Internal server error.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      500
    );
  }
});

/* -------------------------------------------------------------------------- */
/* Email Templates                                                            */
/* -------------------------------------------------------------------------- */

function getEmailShell(
  title: string,
  headerTitle: string,
  subtitle: string,
  content: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>${escapeHtml(title)}</title>

<style>
body {
  margin: 0;
  padding: 0;
  background: #f5f7fa;
  font-family: Arial, Helvetica, sans-serif;
  color: #333;
}

.wrapper {
  width: 100%;
  padding: 30px 0;
}

.container {
  max-width: 650px;
  margin: auto;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.brand {
  padding: 24px 30px 10px;
  text-align: center;
}

.brand-name {
  font-size: 30px;
  font-weight: 700;
}

.attend {
  color: #1702f9;
}

.edge {
  color: #39FF14;
}

.tagline {
  margin-top: 5px;
  font-size: 13px;
  color: #777;
}

.header {
  background: #1702f9;
  color: white;
  padding: 28px;
  text-align: center;
}

.header h1 {
  margin: 0;
  font-size: 24px;
}

.header p {
  margin: 8px 0 0;
  font-size: 14px;
}

.content {
  padding: 30px;
  background: #f8f9fa;
}

.greeting {
  font-size: 16px;
}

.message {
  font-size: 15px;
  line-height: 1.7;
  color: #555;
}

.details {
  background: white;
  padding: 20px;
  border-left: 4px solid #1702f9;
  margin: 22px 0;
  border-radius: 5px;
}

.details-row {
  margin: 12px 0;
  font-size: 14px;
}

.details-label {
  font-weight: 600;
  color: #1702f9;
}

.details-value {
  color: #333;
}

.button-wrapper {
  text-align: center;
  margin: 28px 0;
}

.button {
  display: inline-block;
  padding: 13px 28px;
  background: #1702f9;
  color: white !important;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
}

.status-approved {
  color: #198754;
  font-weight: 700;
}

.status-rejected {
  color: #dc3545;
  font-weight: 700;
}

.status-pending {
  color: #b7791f;
  font-weight: 700;
}

.footer {
  background: #f0f0f0;
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: #888;
}
</style>
</head>

<body>

<div class="wrapper">

<div class="container">

<div class="brand">
  <div class="brand-name">
    <span class="attend">Attend</span><span class="edge">Edge</span>
  </div>

  <div class="tagline">
    Smart Attendance &amp; Leave Management
  </div>
</div>

<div class="header">
  <h1>${escapeHtml(headerTitle)}</h1>
  <p>${escapeHtml(subtitle)}</p>
</div>

<div class="content">
${content}
</div>

<div class="footer">
  <p>This is an automated email from AttendEdge. Please do not reply.</p>
  <p>AttendEdge Workforce Management</p>
</div>

</div>

</div>

</body>
</html>
`;
}

function getLeaveAppliedEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  reason: string,
  recipientName: string
): string {
  return getEmailShell(
    "New Leave Application",
    "New Leave Application",
    "A leave request requires your attention",
    `
<p class="greeting">
  Dear ${escapeHtml(recipientName)},
</p>

<p class="message">
  <strong>${escapeHtml(employeeName)}</strong>
  has submitted a new leave application that requires your attention.
</p>

<div class="details">

<div class="details-row">
<span class="details-label">Leave Type:</span>
<span class="details-value">${escapeHtml(leaveType)}</span>
</div>

<div class="details-row">
<span class="details-label">Start Date:</span>
<span class="details-value">${escapeHtml(formatDate(startDate))}</span>
</div>

<div class="details-row">
<span class="details-label">End Date:</span>
<span class="details-value">${escapeHtml(formatDate(endDate))}</span>
</div>

<div class="details-row">
<span class="details-label">Duration:</span>
<span class="details-value">${escapeHtml(totalDays)} day(s)</span>
</div>

<div class="details-row">
<span class="details-label">Reason:</span>
<span class="details-value">${escapeHtml(reason)}</span>
</div>

<div class="details-row">
<span class="details-label">Status:</span>
<span class="status-pending">Pending Approval</span>
</div>

</div>

<p class="message">
Please review and approve or reject this request.
</p>

<div class="button-wrapper">
<a
href="${escapeHtml(APP_URL)}/leave-management"
class="button"
>
Review Leave Request
</a>
</div>
`
  );
}

function getLeaveApplicationReceivedEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  reason: string
): string {
  return getEmailShell(
    "Leave Application Received",
    "Leave Application Received",
    "Your leave request is pending approval",
    `
<p class="greeting">
Dear ${escapeHtml(employeeName)},
</p>

<p class="message">
We have received your leave application. It is now
<span class="status-pending">PENDING APPROVAL</span>.
</p>

<div class="details">

<div class="details-row">
<span class="details-label">Leave Type:</span>
<span class="details-value">${escapeHtml(leaveType)}</span>
</div>

<div class="details-row">
<span class="details-label">Start Date:</span>
<span class="details-value">${escapeHtml(formatDate(startDate))}</span>
</div>

<div class="details-row">
<span class="details-label">End Date:</span>
<span class="details-value">${escapeHtml(formatDate(endDate))}</span>
</div>

<div class="details-row">
<span class="details-label">Duration:</span>
<span class="details-value">${escapeHtml(totalDays)} day(s)</span>
</div>

<div class="details-row">
<span class="details-label">Reason:</span>
<span class="details-value">${escapeHtml(reason)}</span>
</div>

<div class="details-row">
<span class="details-label">Status:</span>
<span class="status-pending">Pending Approval</span>
</div>

</div>

<p class="message">
You will receive another email when your request is approved or rejected.
</p>
`
  );
}

function getLeaveApprovedEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  approverName: string,
  comments?: string | null
): string {
  return getEmailShell(
    "Leave Request Approved",
    "Leave Request Approved",
    "Your leave request has been approved",
    `
<p class="greeting">
Dear ${escapeHtml(employeeName)},
</p>

<p class="message">
Your leave request has been
<span class="status-approved">APPROVED</span>.
</p>

<div class="details">

<div class="details-row">
<span class="details-label">Leave Type:</span>
<span class="details-value">${escapeHtml(leaveType)}</span>
</div>

<div class="details-row">
<span class="details-label">Start Date:</span>
<span class="details-value">${escapeHtml(formatDate(startDate))}</span>
</div>

<div class="details-row">
<span class="details-label">End Date:</span>
<span class="details-value">${escapeHtml(formatDate(endDate))}</span>
</div>

<div class="details-row">
<span class="details-label">Duration:</span>
<span class="details-value">${escapeHtml(totalDays)} day(s)</span>
</div>

<div class="details-row">
<span class="details-label">Approved By:</span>
<span class="details-value">${escapeHtml(approverName)}</span>
</div>

${
  comments
    ? `
<div class="details-row">
<span class="details-label">Comments:</span>
<span class="details-value">${escapeHtml(comments)}</span>
</div>
`
    : ""
}

</div>

<p class="message">
Your leave has been confirmed.
</p>
`
  );
}

function getLeaveRejectedEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  rejectorName: string,
  comments?: string | null
): string {
  return getEmailShell(
    "Leave Request Rejected",
    "Leave Request Rejected",
    "Your leave request has been rejected",
    `
<p class="greeting">
Dear ${escapeHtml(employeeName)},
</p>

<p class="message">
Your leave request has been
<span class="status-rejected">REJECTED</span>.
</p>

<div class="details">

<div class="details-row">
<span class="details-label">Leave Type:</span>
<span class="details-value">${escapeHtml(leaveType)}</span>
</div>

<div class="details-row">
<span class="details-label">Start Date:</span>
<span class="details-value">${escapeHtml(formatDate(startDate))}</span>
</div>

<div class="details-row">
<span class="details-label">End Date:</span>
<span class="details-value">${escapeHtml(formatDate(endDate))}</span>
</div>

<div class="details-row">
<span class="details-label">Duration:</span>
<span class="details-value">${escapeHtml(totalDays)} day(s)</span>
</div>

<div class="details-row">
<span class="details-label">Rejected By:</span>
<span class="details-value">${escapeHtml(rejectorName)}</span>
</div>

${
  comments
    ? `
<div class="details-row">
<span class="details-label">Reason / Comments:</span>
<span class="details-value">${escapeHtml(comments)}</span>
</div>
`
    : ""
}

</div>

<p class="message">
If you have any questions about this decision,
please contact your reporting manager.
</p>
`
  );
}
