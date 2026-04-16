/**
 * Base layout for all emails to maintain consistent branding and styling.
 */
function baseLayout(title: string, content: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <header style="padding: 24px 0; text-align: center; border-bottom: 1px solid #eee;">
        <h1 style="margin: 0; font-size: 24px; color: #000;">Assessly</h1>
        <p style="margin: 4px 0 0; font-size: 14px; color: #666;">${title}</p>
      </header>
      
      <main style="padding: 32px 0;">
        ${content}
      </main>
      
      <footer style="padding: 24px 0; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
        <p>&copy; ${new Date().getFullYear()} Assessly. All rights reserved.</p>
        <p>If you did not request this email, please ignore it.</p>
      </footer>
    </div>
  `;
}

/**
 * Template for the Magic Link authentication email.
 */
export function getMagicLinkHtml(link: string): string {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px;">Welcome to Assessly</h2>
    <p style="margin: 0 0 24px;">Click the button below to sign in to your account. This link will expire in 10 minutes.</p>
    
    <div style="margin: 32px 0; text-align: center;">
      <a href="${link}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Sign In to Assessly</a>
    </div>
    
    <p style="margin: 32px 0 8px; font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
    <p style="margin: 0; font-size: 14px; color: #007bff; word-break: break-all;">${link}</p>
  `;

  return baseLayout('Sign In Request', content);
}

/**
 * You can add more template helpers here as needed.
 * Example: export function getWelcomeEmailHtml(name: string) { ... }
 */
