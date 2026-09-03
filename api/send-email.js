// Vercel serverless function: POST /api/send-email
// Sends the facility acknowledgement email through Resend.
// Requires the RESEND_API_KEY environment variable to be set in your Vercel project
// (Project Settings > Environment Variables) — never expose this key on the client.

import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured on the server.' });
  }

  const { to, subject, html, text, from } = req.body || {};
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html or text.' });
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: from || 'RSSB Medical Invoice Workflow <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
      text,
    });

    if (error) return res.status(502).json({ error: error.message || 'Resend failed to send the email.' });
    return res.status(200).json({ id: data?.id });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error sending email.' });
  }
}
