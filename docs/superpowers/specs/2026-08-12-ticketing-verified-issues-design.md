# Ticketing Verified Issues Design

## Goal

Fix only the issues reproduced twice on the deployed application, delivering each group independently with targeted tests rather than a full-system test run.

## Approved decisions

- Soft-deleted tickets appear only in Recycle Bin. Normal dashboards, queues, exports, charts, and details exclude them.
- Employees see their own active requests by default and may switch to read-only department requests. Administrators choosing User portal follow the same restrictions; global management belongs to Admin console.
- Departments become a controlled directory maintained only by Super Admin. `AI Department` and `General` migrate into `AI & Automation Transformation`; unmatched API tickets belong to the system-only `System Integrations` department.
- Ticket department ownership is fixed at creation. Authors retain access to their own active history after transferring departments. Department peers see only necessary requester data and public discussion.
- New tickets require an explicit category. Category templates remain in one Description field, but unchanged templates cannot be submitted. P0 requires confirmation and impact details. Errors are inline and focus the first invalid field.
- Knowledge remains authenticated. Login preserves the requested destination, including after an administrator chooses a portal mode. The homepage prioritizes sign-in and has one registration CTA.
- Internal enum values remain unchanged in storage and APIs but are formatted consistently for people.
- Mobile sticky submission remains unchanged because geometric retesting found no overlap.

## Delivery boundaries

Work ships in five independently reviewable batches: deletion consistency; department access; ticket intake; public/auth navigation; display consistency. Each batch runs only its named tests and receives two focused deployed-browser verification passes. Full test suites and whole-site E2E runs are intentionally excluded.

## Security model

Database RLS and server-side response shaping are authoritative. UI hiding is never treated as authorization. Department peers can read active department tickets, bound attachments, and public comments, but cannot reply, reopen, mutate, or see internal notes and diagnostic identity fields. Draft attachments remain private to their uploader.
