# Supabase Auth Email Templates Design

## Purpose

Create one consistent branded email system for the two Supabase Auth flows currently used by the Internal Ticketing System:

- Confirm Signup, triggered after registration.
- Reset Password (Recovery), triggered from the forgot-password page.

The design must look appropriate for an internal Grant Thornton system, communicate security actions clearly, and remain reliable in common desktop and mobile email clients.

## Approved Direction

Use the **Corporate Letter** direction with the **Minimal Brand** header. The visual tone is formal enough for a corporate message while the copy remains professional and friendly.

The email is English-only and identifies the sender as:

> Grant Thornton · AI Department

The design deliberately excludes promotional banners, social-media links, marketing copy, and unrelated navigation.

## Shared Visual System

Both templates use the same structure and styling:

1. A thin Grant Thornton purple rule across the top.
2. A compact brand header containing the approved brand mark treatment, `Grant Thornton`, and `AI Department`.
3. A thin neutral divider.
4. A clear serif-style message heading.
5. Short body copy in a broadly supported sans-serif font stack.
6. One solid purple primary action button.
7. A neutral security notice explaining what to do if the recipient did not initiate the action.
8. A plain-text fallback URL below the button.
9. A restrained footer containing:
   - `Grant Thornton Malaysia · Confidential system email`
   - `This is an automated message. Please do not reply.`

Use email-safe, table-based HTML with inline styles. Keep the content container readable on desktop and fluid on narrow screens. Do not depend on JavaScript, external stylesheets, web fonts, CSS variables, dark-mode-only colors, or advanced layout features.

### Core Colors

- Brand purple: `#5c2d91`
- Primary text: approximately `#242126`
- Secondary text: approximately `#625e65`
- Divider: approximately `#dedade`
- Security notice background: approximately `#f5f4f3`
- Email body: `#ffffff`

Exact neutral values may be adjusted slightly during implementation to improve email-client rendering, but the approved white, grey, and purple character must remain unchanged.

## Personalization

Start each message with the recipient's registration display name when it is available:

> Hello Alex,

The Supabase template should read the name from the signup user metadata field `display_name`. If the value is absent or empty, the greeting must fall back to:

> Hello,

The fallback must not expose an empty placeholder, `null`, an email address, or template syntax to the recipient.

## Confirm Signup Template

### Subject

`Confirm your Grant Thornton Ticketing account`

### Heading

`Confirm your email address`

### Body

`Thank you for registering for the Internal Ticketing System. Please confirm your email address to finish setting up your access.`

### Primary Action

- Label: `Confirm email`
- Destination: the Supabase confirmation URL for the signup flow.

### Security Notice

`If you did not create this account, you can safely ignore this email. No account access will be granted.`

## Reset Password Template

### Subject

`Reset your Grant Thornton Ticketing password`

### Heading

`Reset your password`

### Body

`We received a request to reset the password for your Internal Ticketing System account. Use the button below to choose a new password.`

### Primary Action

- Label: `Reset password`
- Destination: the Supabase confirmation URL for the recovery flow.

### Security Notice

`If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.`

## Supabase Integration

The design targets the hosted Supabase Email Templates configuration:

- Apply the signup template to **Confirm Signup**.
- Apply the password template to **Reset Password / Recovery**.
- Preserve Supabase's confirmation-link variable as the source for both the button URL and the fallback URL.
- Use Supabase-supported Go template syntax for conditional display-name personalization.
- Do not alter the existing redirect destinations in the Next.js registration or forgot-password flows.

No new application-side email service is part of this design. Ticket-created, comment, assignment, and status notifications remain in-app notifications and are not converted into emails.

If the hosted Supabase project does not permit customized templates while using its default email provider, configuring custom SMTP is a deployment prerequisite rather than a change to the email design.

## Accessibility and Compatibility

- The message must remain understandable if images do not load.
- Do not put essential text inside an image.
- Give the brand image meaningful alternative text if an image is used.
- Maintain strong contrast for text and the primary button.
- Make the action button large enough for touch interaction.
- Include the full fallback link as selectable text.
- Keep the reading order logical without relying on visual layout.
- Use a preheader summarizing the requested action.
- Test at minimum in Gmail web/mobile, Outlook desktop/web, and a narrow mobile viewport.

## Error and Safety Behaviour

- A missing display name falls back to `Hello,`.
- A blocked image does not obscure the sender identity or requested action.
- If the button cannot be activated, the same confirmation URL is available as plain text.
- The template contains only the Supabase-generated action URL; it does not add tracking or third-party redirect links.
- No password, one-time token, or sensitive account data appears in visible copy beyond the required action URL.

## Acceptance Criteria

The design is complete when:

1. Confirm Signup and Reset Password share the approved Corporate Letter visual system.
2. Both subjects, headings, body copy, button labels, security notices, fallback links, and footer match this specification.
3. The greeting uses `display_name` when available and degrades cleanly to `Hello,`.
4. Each button and fallback URL uses the correct Supabase confirmation URL.
5. The templates render legibly on desktop and mobile in the target email clients.
6. The emails remain understandable with images disabled.
7. Existing application redirect behaviour remains unchanged.
8. No ticket-notification email feature or unrelated application change is introduced.

## Verification Plan

After implementation:

1. Send a real signup confirmation email using a test account with a display name.
2. Send or preview a message without a display name and verify the fallback greeting.
3. Trigger a real recovery email from the existing forgot-password page.
4. Verify both buttons reach the existing `/auth/callback` flow and the intended next page.
5. Verify the displayed fallback URL matches the button URL.
6. Inspect both messages with images enabled and disabled.
7. Inspect desktop and mobile layouts in Gmail and Outlook.
8. Confirm the email subject, sender identity, footer, and security wording match the approved design.
