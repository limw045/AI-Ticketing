import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "E2E_EMPLOYEE_EMAIL",
  "E2E_EMPLOYEE_PASSWORD",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const createTestClient = () => createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const employee = createTestClient();
const admin = createTestClient();
const anonymous = createTestClient();
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const createdTicketIds = [];
const uploadedObjects = [];
let apiClientId = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return data.user;
}

async function cleanup() {
  if (createdTicketIds.length) {
    await admin.from("tickets").update({ deleted_at: new Date().toISOString() }).in("id", createdTicketIds);
  }
  if (apiClientId) {
    await admin.from("api_clients").update({ is_active: false }).eq("id", apiClientId);
  }
  for (const object of uploadedObjects) {
    await object.client.storage.from("ticket-attachments").remove([object.path]);
  }
}

try {
  const employeeUser = await signIn(
    employee,
    process.env.E2E_EMPLOYEE_EMAIL,
    process.env.E2E_EMPLOYEE_PASSWORD
  );
  const adminUser = await signIn(
    admin,
    process.env.E2E_ADMIN_EMAIL,
    process.env.E2E_ADMIN_PASSWORD
  );

  const { data: employeeProfile, error: employeeProfileError } = await employee
    .from("profiles")
    .select("id, role, account_status, user_type, supervisor_name")
    .eq("id", employeeUser.id)
    .single();
  assert(!employeeProfileError && employeeProfile?.role === "employee", "Employee profile was not provisioned correctly");
  assert(employeeProfile.account_status === "active" && employeeProfile.user_type === "intern", "Employee profile status/type is incorrect");
  assert(Boolean(employeeProfile.supervisor_name), "Intern supervisor was not persisted");

  const { data: adminProfile, error: adminProfileError } = await admin
    .from("profiles")
    .select("id, role, account_status, user_type")
    .eq("id", adminUser.id)
    .single();
  assert(!adminProfileError && adminProfile?.role === "admin", "Admin bootstrap profile was not provisioned correctly");
  assert(adminProfile.account_status === "active", "Admin profile is inactive");
  pass("Auth trigger provisioned employee and admin profiles");

  const { data: ticket, error: ticketError } = await employee
    .from("tickets")
    .insert({
      title: `[E2E ${runId}] Portal persistence`,
      description: "Backend verification ticket",
      category: "System Bug",
      priority: "high",
      author_id: employeeUser.id,
      source: "portal",
      device_context: { source: "automated-e2e" },
    })
    .select("id, ticket_number, status, author_id, source")
    .single();
  assert(!ticketError && ticket?.id, `Portal ticket insert failed: ${ticketError?.message}`);
  createdTicketIds.push(ticket.id);
  assert(ticket.author_id === employeeUser.id && ticket.source === "portal", "Portal ticket identity/source is incorrect");
  pass("Employee created a persisted portal ticket");

  const { data: forbiddenUpdate, error: forbiddenUpdateError } = await employee
    .from("tickets")
    .update({ status: "closed", assignee_id: employeeUser.id })
    .eq("id", ticket.id)
    .select("id, status");
  assert(forbiddenUpdateError || forbiddenUpdate?.length === 0, "Employee unexpectedly updated protected ticket fields");
  const { data: unchangedTicket } = await employee.from("tickets").select("status, assignee_id").eq("id", ticket.id).single();
  assert(unchangedTicket?.status === "open" && unchangedTicket.assignee_id === null, "Employee mutation changed the ticket despite RLS");
  pass("Employee ticket privilege escalation was blocked");

  const { error: escalationError } = await employee
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", employeeUser.id);
  assert(Boolean(escalationError), "Employee unexpectedly promoted their own role");
  pass("Profile role escalation was blocked");

  const { data: comment, error: commentError } = await employee
    .from("comments")
    .insert({ ticket_id: ticket.id, author_id: employeeUser.id, content: "Employee E2E comment", is_internal_note: false })
    .select("id")
    .single();
  assert(!commentError && comment?.id, `Employee comment insert failed: ${commentError?.message}`);

  const { error: forbiddenInternalError } = await employee.from("comments").insert({
    ticket_id: ticket.id,
    author_id: employeeUser.id,
    content: "Forbidden internal note",
    is_internal_note: true,
  });
  assert(Boolean(forbiddenInternalError), "Employee unexpectedly created an internal note");

  const { data: internalNote, error: internalNoteError } = await admin
    .from("comments")
    .insert({ ticket_id: ticket.id, author_id: adminUser.id, content: "Admin E2E internal note", is_internal_note: true })
    .select("id")
    .single();
  assert(!internalNoteError && internalNote?.id, `Admin internal note failed: ${internalNoteError?.message}`);

  const { data: employeeComments, error: employeeCommentsError } = await employee
    .from("comments")
    .select("id, is_internal_note")
    .eq("ticket_id", ticket.id);
  assert(!employeeCommentsError && employeeComments?.some((item) => item.id === comment.id), "Employee cannot read their normal comment");
  assert(!employeeComments.some((item) => item.is_internal_note), "Employee can read an internal note");
  pass("Comment persistence and internal-note isolation work");

  const { data: updatedTicket, error: adminUpdateError } = await admin
    .from("tickets")
    .update({ status: "in_progress", assignee_id: adminUser.id })
    .eq("id", ticket.id)
    .select("id, status, assignee_id, first_responded_at")
    .single();
  assert(!adminUpdateError && updatedTicket?.status === "in_progress", `Admin ticket update failed: ${adminUpdateError?.message}`);
  assert(updatedTicket.assignee_id === adminUser.id && updatedTicket.first_responded_at, "Assignment/response timestamp did not persist");

  const { data: auditRows, error: auditError } = await employee
    .from("ticket_audit_logs")
    .select("action")
    .eq("ticket_id", ticket.id);
  assert(!auditError, `Audit log read failed: ${auditError?.message}`);
  const actions = new Set(auditRows.map((row) => row.action));
  assert(actions.has("ticket_created") && actions.has("status_changed") && actions.has("assignee_changed"), "Expected audit events are missing");

  const { data: adminNotifications, error: adminNotificationsError } = await admin
    .from("notifications")
    .select("kind")
    .eq("ticket_id", ticket.id);
  assert(!adminNotificationsError && adminNotifications?.some((item) => item.kind === "new_ticket"), "Admin did not receive a new-ticket notification");

  const { data: employeeNotifications, error: employeeNotificationsError } = await employee
    .from("notifications")
    .select("kind")
    .eq("ticket_id", ticket.id);
  assert(!employeeNotificationsError && employeeNotifications?.some((item) => item.kind === "status"), "Employee did not receive a status notification");
  pass("Audit logs and role-scoped notifications were persisted");

  const { error: resolveError } = await admin
    .from("tickets")
    .update({ status: "resolved" })
    .eq("id", ticket.id);
  assert(!resolveError, `Ticket resolve failed: ${resolveError?.message}`);
  const { data: reopenResult, error: reopenError } = await employee.rpc("reopen_own_ticket", {
    target_ticket_id: ticket.id,
  });
  assert(!reopenError && reopenResult === true, `Seven-day reopen failed: ${reopenError?.message}`);
  const { data: reopenedTicket } = await employee.from("tickets").select("status, resolved_at").eq("id", ticket.id).single();
  assert(reopenedTicket?.status === "open" && reopenedTicket.resolved_at === null, "Reopened ticket state is incorrect");
  pass("Employee reopened their own resolved ticket through the constrained RPC");

  const pngBytes = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nL8AAAAASUVORK5CYII=", "base64"));
  const employeeObject = `${employeeUser.id}/e2e-${runId}.png`;
  const adminObject = `${adminUser.id}/e2e-${runId}.png`;
  const { error: employeeUploadError } = await employee.storage.from("ticket-attachments").upload(employeeObject, pngBytes, { contentType: "image/png" });
  assert(!employeeUploadError, `Employee attachment upload failed: ${employeeUploadError?.message}`);
  uploadedObjects.push({ client: employee, path: employeeObject });
  const { error: adminUploadError } = await admin.storage.from("ticket-attachments").upload(adminObject, pngBytes, { contentType: "image/png" });
  assert(!adminUploadError, `Admin attachment upload failed: ${adminUploadError?.message}`);
  uploadedObjects.push({ client: admin, path: adminObject });

  const { data: ownSigned, error: ownSignedError } = await employee.storage.from("ticket-attachments").createSignedUrl(employeeObject, 60);
  assert(!ownSignedError && ownSigned?.signedUrl, "Employee cannot sign their own attachment");
  const { data: agentSigned, error: agentSignedError } = await admin.storage.from("ticket-attachments").createSignedUrl(employeeObject, 60);
  assert(!agentSignedError && agentSigned?.signedUrl, "Admin cannot access an employee attachment");
  const { data: crossSigned, error: crossSignedError } = await employee.storage.from("ticket-attachments").createSignedUrl(adminObject, 60);
  assert(crossSignedError || !crossSigned?.signedUrl, "Employee unexpectedly accessed another user's attachment");
  pass("Private attachment upload and cross-user access policies work");

  const { data: clientResult, error: clientError } = await admin.rpc("create_api_client", {
    client_name: `E2E Client ${runId}`,
  });
  assert(!clientError && clientResult?.api_key && clientResult?.id, `API client creation failed: ${clientError?.message}`);
  apiClientId = clientResult.id;
  const idempotencyKey = `e2e-${runId}`;
  const ingestPayload = {
    p_api_key: clientResult.api_key,
    p_ticket_title: `[E2E ${runId}] API persistence`,
    p_ticket_description: "API backend verification ticket",
    p_ticket_category: "System Bug",
    p_ticket_priority: "urgent",
    p_user_email: process.env.E2E_EMPLOYEE_EMAIL,
    p_system_logs: { source: "e2e", token: "[REDACTED]" },
    p_idempotency_key: idempotencyKey,
  };
  const { data: firstIngest, error: firstIngestError } = await anonymous.rpc("ingest_ticket", ingestPayload);
  assert(!firstIngestError && firstIngest?.id, `API ticket ingestion failed: ${firstIngestError?.message}`);
  createdTicketIds.push(firstIngest.id);
  const { data: secondIngest, error: secondIngestError } = await anonymous.rpc("ingest_ticket", ingestPayload);
  assert(!secondIngestError && secondIngest?.id === firstIngest.id && secondIngest?.duplicate === true, "Idempotent retry did not return the existing ticket");

  const { data: apiTickets, error: apiTicketsError } = await admin
    .from("tickets")
    .select("id, source, author_id, reporter_email, system_logs")
    .eq("id", firstIngest.id);
  assert(!apiTicketsError && apiTickets?.length === 1, "API ticket is not visible to admin");
  assert(apiTickets[0].source === "api" && apiTickets[0].author_id === employeeUser.id, "API ticket reporter mapping is incorrect");

  const { error: revokeError } = await admin.from("api_clients").update({ is_active: false }).eq("id", apiClientId);
  assert(!revokeError, `API client revocation failed: ${revokeError?.message}`);
  const { error: revokedIngestError } = await anonymous.rpc("ingest_ticket", {
    ...ingestPayload,
    p_idempotency_key: `${idempotencyKey}-after-revoke`,
  });
  assert(Boolean(revokedIngestError), "Revoked API key still created a ticket");
  pass("Hashed API keys, reporter mapping, revocation, and idempotency work");

  console.log("BACKEND_E2E_OK");
} finally {
  await cleanup();
}
