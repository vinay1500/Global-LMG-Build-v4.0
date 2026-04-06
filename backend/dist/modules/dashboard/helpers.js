const STAGE_LABELS = {
    'action-plan': 'Action Plan',
    'consultation': 'Consultation',
    'request-received': 'Request Received',
    'resolution': 'Resolution',
    'verification-call': 'Verification Call',
};
const STAGE_ORDER = [
    'request-received',
    'verification-call',
    'consultation',
    'action-plan',
    'resolution',
];
export const buildStages = (currentStage) => {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    return STAGE_ORDER.map((stageId, index) => ({
        completed: currentIndex >= 0 ? index <= currentIndex : false,
        id: stageId,
        label: STAGE_LABELS[stageId],
    }));
};
export const createEmptyDashboardSnapshot = (currentClient) => ({
    advocates: [],
    auditEntries: [],
    currentClient,
    documents: [],
    events: [],
    invoices: [],
    leads: [],
    matters: [],
    messages: [],
    packages: [],
    payments: [],
    staff: [],
    threads: [],
    users: [currentClient],
});
