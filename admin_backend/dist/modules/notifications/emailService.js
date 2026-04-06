import { env } from '../../config/env.js';
import { textToHtmlParagraph } from '../../lib/html.js';
import { serviceUnavailable } from '../../lib/httpErrors.js';
export const transactionalEmailService = {
    async send(input) {
        if (env.EMAIL_PROVIDER_MODE === 'preview') {
            return {
                deliveryHint: `Preview email to ${input.to}: ${input.subject}`,
            };
        }
        if (env.EMAIL_PROVIDER_MODE === 'disabled') {
            throw serviceUnavailable('email_provider_disabled', 'Email delivery is disabled in this environment.');
        }
        if (!env.RESEND_API_KEY || !env.EMAIL_FROM_ADDRESS) {
            throw serviceUnavailable('email_provider_misconfigured', 'Email provider is missing required configuration.');
        }
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                attachments: (input.attachments || []).map((attachment) => ({
                    content: attachment.contentBase64,
                    filename: attachment.fileName,
                })),
                from: env.EMAIL_FROM_ADDRESS,
                html: input.html || textToHtmlParagraph(input.text),
                subject: input.subject,
                text: input.text,
                to: [input.to],
            }),
        });
        if (!response.ok) {
            throw serviceUnavailable('email_provider_failed', `Email provider rejected the request with status ${response.status}.`);
        }
        const body = (await response.json());
        return {
            providerReference: body.id,
        };
    },
};
