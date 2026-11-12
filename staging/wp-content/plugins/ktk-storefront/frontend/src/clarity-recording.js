import { journeyEnvironment } from './journey-queue.js';

const identifier = value => typeof value === 'string' && /^[a-z0-9]{1,64}$/i.test(value) ? value : null;

export function clarityRecordingReference(metadata) {
  const projectId = identifier(metadata?.projectId);
  const userId = identifier(metadata?.userId);
  const sessionId = identifier(metadata?.sessionId);
  return projectId && userId && sessionId ? { projectId, userId, sessionId } : null;
}

export function createClarityRecordingBridge({ queue, consentGranted, pageId, getWindow = () => window }) {
  let projectId = null;
  let subscribed = null;
  let subscribedVisit = null;
  const captured = new Set();
  return {
    attach(expectedProjectId) {
      const win = getWindow();
      projectId = identifier(expectedProjectId);
      if (!projectId || !consentGranted() || journeyEnvironment(win.location?.pathname) !== 'production'
        || typeof win.clarity !== 'function') return false;
      const visitId = queue.currentVisit().id;
      if (subscribed === win.clarity && subscribedVisit === visitId) return true;
      const runtime = win.clarity;
      const recall = subscribed !== runtime;
      try {
        // Native IDs plus consent notifications preserve correlation across denied-session restarts.
        runtime('metadata', (metadata, playback, consent) => {
          if (getWindow() !== win || !consentGranted() || playback !== true
            || consent?.analytics_Storage !== 'granted'
            || journeyEnvironment(win.location?.pathname) !== 'production') return;
          const reference = clarityRecordingReference(metadata);
          if (!reference || reference.projectId !== projectId) return;
          const visit = queue.currentVisit();
          const key = [visit.id, reference.projectId, reference.userId, reference.sessionId].join(':');
          if (captured.has(key)) return;
          captured.add(key);
          if (captured.size > 32) captured.delete(captured.values().next().value);
          queue.record('clarity_recording_linked', { ...reference, environment: 'production' }, pageId());
        }, true, recall, true);
        subscribed = runtime;
        subscribedVisit = visitId;
        return true;
      } catch {
        return false;
      }
    },
  };
}
