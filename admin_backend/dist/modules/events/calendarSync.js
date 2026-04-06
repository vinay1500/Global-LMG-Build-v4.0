import { JWT } from 'google-auth-library';
import { env } from '../../config/env.js';
import { createPublicId } from '../../lib/ids.js';
import { serviceUnavailable } from '../../lib/httpErrors.js';
const resolveJwtClient = () => {
    if (env.GOOGLE_CALENDAR_PROVIDER_MODE !== 'google-calendar') {
        return null;
    }
    if (!env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL ||
        !env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY) {
        throw serviceUnavailable('calendar_provider_misconfigured', 'Google Calendar provider is not fully configured.');
    }
    return new JWT({
        email: env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL,
        key: env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/calendar'],
        subject: env.GOOGLE_CALENDAR_IMPERSONATE_USER || undefined,
    });
};
const getBearerToken = async () => {
    const client = resolveJwtClient();
    if (!client) {
        return null;
    }
    const token = await client.authorize();
    if (!token.access_token) {
        throw serviceUnavailable('calendar_provider_failed', 'Google Calendar did not return an access token.');
    }
    return token.access_token;
};
const extractConferenceUri = (body) => {
    if (typeof body?.hangoutLink === 'string' && body.hangoutLink.trim().length > 0) {
        return body.hangoutLink.trim();
    }
    const entryPoints = Array.isArray(body?.conferenceData?.entryPoints)
        ? body.conferenceData.entryPoints
        : [];
    const video = entryPoints.find((entry) => entry?.entryPointType === 'video');
    return typeof video?.uri === 'string' ? video.uri : null;
};
const callCalendarApi = async (path, method, body) => {
    const token = await getBearerToken();
    if (!token) {
        return {
            externalEventId: null,
            hostUrl: null,
            joinUrl: null,
            providerCode: 'none',
            syncStatusCode: 'disabled',
        };
    }
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw serviceUnavailable('calendar_provider_failed', `Google Calendar rejected the request with status ${response.status}: ${errorBody}`);
    }
    const payload = await response.json();
    return {
        externalEventId: typeof payload?.id === 'string' ? payload.id : null,
        hostUrl: typeof payload?.htmlLink === 'string' ? payload.htmlLink : null,
        joinUrl: extractConferenceUri(payload),
        providerCode: 'google-meet',
        syncStatusCode: 'synced',
    };
};
const buildCalendarPayload = (input) => ({
    attendees: input.attendees.map((entry) => ({ email: entry.email })),
    conferenceData: {
        createRequest: {
            conferenceSolutionKey: {
                type: 'hangoutsMeet',
            },
            requestId: createPublicId(),
        },
    },
    description: input.description || '',
    end: {
        dateTime: input.endAt,
        timeZone: input.timeZone,
    },
    location: input.locationText || '',
    start: {
        dateTime: input.startAt,
        timeZone: input.timeZone,
    },
    summary: input.title,
});
export const adminCalendarSyncService = {
    async createMeeting(input) {
        return callCalendarApi('/events?conferenceDataVersion=1&sendUpdates=none', 'POST', buildCalendarPayload(input));
    },
    async updateMeeting(externalEventId, input) {
        return callCalendarApi(`/events/${encodeURIComponent(externalEventId)}?conferenceDataVersion=1&sendUpdates=none`, 'PATCH', buildCalendarPayload(input));
    },
    async cancelMeeting(externalEventId) {
        const token = await getBearerToken();
        if (!token) {
            return {
                providerCode: 'none',
                syncStatusCode: 'disabled',
            };
        }
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(externalEventId)}?sendUpdates=none`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'cancelled',
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw serviceUnavailable('calendar_provider_failed', `Google Calendar rejected the cancellation with status ${response.status}: ${errorBody}`);
        }
        return {
            providerCode: 'google-meet',
            syncStatusCode: 'synced',
        };
    },
};
