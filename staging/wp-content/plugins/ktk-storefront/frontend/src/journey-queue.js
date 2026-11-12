const QUEUE_KEY = 'ktk-storefront-journey-events-v1';
const VISIT_KEY = 'ktk-storefront-journey-visit-v1';
const QUEUE_TTL_MS = 24 * 60 * 60 * 1000;
const VISIT_IDLE_MS = 30 * 60 * 1000;
const MAX_EVENTS = 200;

export function journeyEnvironment(pathname = '') {
  return /^\/staging(?:\/|$)/.test(pathname) ? 'staging' : 'production';
}

export function createJourneyQueue(getWindow = () => window) {
  let memoryQueue = [];
  let memoryVisit = null;
  const parse = (value, fallback) => {
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  };
  const createId = () => {
    if (getWindow().crypto?.randomUUID) return getWindow().crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
      const random = Math.floor(Math.random() * 16);
      return (character === 'x' ? random : (random & 3) | 8).toString(16);
    });
  };
  const read = () => {
    let stored = memoryQueue;
    try { stored = parse(getWindow().localStorage.getItem(QUEUE_KEY), []); } catch { /* Memory fallback. */ }
    const now = Date.now();
    memoryQueue = (Array.isArray(stored) ? stored : []).filter(event => {
      const time = Date.parse(event?.occurredAt);
      return event && typeof event.eventId === 'string' && typeof event.visitId === 'string'
        && typeof event.type === 'string' && Number.isFinite(time)
        && time <= now + 300000 && now - time <= QUEUE_TTL_MS;
    }).slice(-MAX_EVENTS);
    return [...memoryQueue];
  };
  const persist = events => {
    memoryQueue = events.slice(-MAX_EVENTS);
    try {
      if (memoryQueue.length) getWindow().localStorage.setItem(QUEUE_KEY, JSON.stringify(memoryQueue));
      else getWindow().localStorage.removeItem(QUEUE_KEY);
    } catch { /* Storage restrictions must not interrupt booking. */ }
  };
  const persistVisit = visit => {
    memoryVisit = visit;
    try { getWindow().sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit)); } catch { /* Memory fallback. */ }
  };
  const currentVisit = () => {
    let stored = memoryVisit;
    try { stored = parse(getWindow().sessionStorage.getItem(VISIT_KEY), null); } catch { /* Memory fallback. */ }
    const now = Date.now();
    const current = stored?.id && Number.isFinite(Number(stored.lastActivityAt))
      && now >= Number(stored.lastActivityAt) && now - Number(stored.lastActivityAt) <= VISIT_IDLE_MS;
    const visit = current ? stored : { id: createId(), sequence: 0 };
    visit.lastActivityAt = now;
    persistVisit(visit);
    return visit;
  };
  return {
    createId,
    read,
    currentVisit,
    record(type, details = null, pageId = null) {
      const visit = currentVisit();
      visit.sequence = Number.isSafeInteger(visit.sequence) && visit.sequence >= 0 ? visit.sequence + 1 : 1;
      persistVisit(visit);
      const event = {
        eventId: createId(), visitId: visit.id, pageId, type,
        occurredAt: new Date().toISOString(), sequence: visit.sequence, details,
      };
      // Re-read storage so returning tabs do not overwrite events from another page.
      persist([...read(), event]);
      return event;
    },
    acknowledge(eventIds) {
      const ids = new Set(Array.isArray(eventIds) ? eventIds : []);
      if (ids.size) persist(read().filter(event => !ids.has(event.eventId)));
    },
    removeTypes(types) {
      const selected = new Set(types);
      persist(read().filter(event => !selected.has(event.type)));
    },
    clear() {
      persist([]);
      memoryVisit = null;
      try { getWindow().sessionStorage.removeItem(VISIT_KEY); } catch { /* Memory fallback. */ }
    },
  };
}
