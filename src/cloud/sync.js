const clone = value => structuredClone(value);
const knownCodes = new Set(['AUTH_REQUIRED','FORBIDDEN','CONFLICT','NETWORK','VALIDATION','INVALID_RESPONSE','ABORTED']);
/** One serialized save queue per signed-in owner. Drafts never enter telemetry. */
export function createSyncController({ repository, initialRevision = 0, onSnapshot = () => {}, onStatus = () => {},
  debounceMs = 500, pollMs = 15000,
  // Clean, unchanged foreground workspaces poll at 30 s after 2 min without
  // interaction; active typing/pointer use keeps the existing 15 s cadence.
  // A second device may take up to 30 s to appear while this tab is idle.
  idleAfterMs = 120000, idlePollMs = 30000,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  eventTarget = globalThis.window,
  visibilityTarget = globalThis.document,
  isOnline = () => globalThis.navigator?.onLine !== false,
  isVisible = () => visibilityTarget?.visibilityState !== 'hidden',
  // Injectable solely for deterministic synthetic polling tests; browsers use native intervals.
  pollScheduler = {setInterval:(fn,ms)=>globalThis.setInterval(fn,ms),
    clearInterval:id=>globalThis.clearInterval(id)} } = {}) {
  if (!repository?.saveSnapshot || !repository?.loadOwnerSnapshot || !Number.isSafeInteger(initialRevision) || initialRevision < 0) {
    throw Error('A snapshot repository and valid initial revision are required.');
  }
  if (typeof now !== 'function' || !Number.isFinite(idleAfterMs) || idleAfterMs < 0 ||
      !Number.isFinite(idlePollMs) || idlePollMs < Math.max(0,pollMs)) {
    throw Error('Invalid idle poll timing or clock.');
  }
  const startedAt = now();
  if (!Number.isFinite(startedAt)) throw Error('Invalid idle poll clock.');
  let lastInteractionAt = startedAt, lastReadAt = startedAt;
  const markInteraction = () => { lastInteractionAt = now(); };
  let revision = initialRevision, state = 'saved', errorCode = null;
  let pending = null, changeVersion = 0, debounceTimer = null, pollTimer = null;
  let writePromise = null, readPromise = null, readController = null, reloadInFlight = false, disposed = false;
  const requests = new Set();
  const getState = () => ({state, revision, hasPending:pending !== null, errorCode});
  function status(next, code = null) {
    if (disposed) return;
    state = next; errorCode = code; onStatus(getState());
  }
  function failed(error) {
    const code = knownCodes.has(error?.code) ? error.code : 'UNKNOWN';
    status(code === 'CONFLICT' ? 'conflict' : code === 'NETWORK' ? 'offline' : 'error', code);
  }
  function cancelDebounce() { clearTimeout(debounceTimer); debounceTimer = null; }
  function request() { const controller = new AbortController(); requests.add(controller); return controller; }
  // An old remote read must never block the next clean refresh. Aborting is a
  // best-effort bandwidth saving: some transports may still resolve late.
  function cancelRead() {
    const obsolete = readController;
    readController = null;
    readPromise = null;
    obsolete?.abort();
  }
  // Default callers may retain and mutate their input, so queue defensively
  // clones it. queueOwned adopts a fully detached mountOrbit.getSnapshot()
  // value, avoiding the second full-workspace clone on every UI edit.
  function enqueue(snapshot,owned) {
    if (disposed) return false;
    markInteraction();
    pending = {snapshot:owned?snapshot:clone(snapshot),version:++changeVersion};
    cancelRead();
    cancelDebounce();
    // A stale base version requires an explicit review, never automatic overwrite.
    if (errorCode === 'CONFLICT') { status('conflict','CONFLICT'); return true; }
    status(isOnline() ? 'pending' : 'offline', isOnline() ? null : 'NETWORK');
    debounceTimer = setTimeout(() => { void flush(); },Math.max(0,debounceMs));
    return true;
  }
  function queue(snapshot){return enqueue(snapshot,false);}
  function queueOwned(detachedSnapshot){return enqueue(detachedSnapshot,true);}
  async function drain() {
    while (!disposed && pending) {
      if (!isOnline()) { status('offline','NETWORK'); return {ok:false,...getState()}; }
      const saving = pending;
      const controller = request();
      status('saving');
      try {
        const result = await repository.saveSnapshot(clone(saving.snapshot),revision,{signal:controller.signal});
        if (disposed) return {ok:false,...getState()};
        if (!Number.isSafeInteger(result?.revision) || result.revision <= revision) throw Object.assign(Error(),{code:'INVALID_RESPONSE'});
        revision = result.revision;
        if (pending?.version === saving.version) pending = null;
      } catch (error) {
        if (!disposed) failed(error);
        return {ok:false,...getState()};
      } finally { requests.delete(controller); }
    }
    if (!disposed) status('saved');
    return {ok:!disposed,...getState()};
  }
  function flush() {
    cancelDebounce();
    if (disposed || errorCode === 'CONFLICT') return Promise.resolve({ok:false,...getState()});
    if (writePromise) return writePromise;
    if (!pending) return Promise.resolve({ok:true,...getState()});
    writePromise = Promise.resolve().then(drain).finally(() => { writePromise = null; });
    return writePromise;
  }
  function refresh() {
    if (disposed || pending || writePromise || reloadInFlight || errorCode === 'CONFLICT') return Promise.resolve({ok:!disposed,changed:false});
    if (readPromise) return readPromise;
    const requestVersion = changeVersion, controller = request();
    readController = controller;
    readPromise = (async () => {
      try {
        if (!isOnline()) { status('offline','NETWORK'); return {ok:false,changed:false}; }
        lastReadAt = now();
        const result = await repository.loadOwnerSnapshot({signal:controller.signal});
        if (disposed || readController !== controller || changeVersion !== requestVersion || pending || writePromise) return {ok:false,changed:false};
        if (!Number.isSafeInteger(result?.revision) || result.revision < revision) throw Object.assign(Error(),{code:'INVALID_RESPONSE'});
        const changed = result.revision > revision;
        if (changed) { // Accept the remote CAS revision only after the UI accepts its snapshot.
          // A dirty Excalidraw edit can reject replacement: keep the old revision
          // so its next save correctly conflicts rather than overwriting remote work.
          onSnapshot(clone(result.snapshot)); revision = result.revision; markInteraction();
        }
        if (!pending && !disposed) status('saved');
        return {ok:true,changed};
      } catch (error) {
        if (!disposed && readController === controller && changeVersion === requestVersion && !pending) failed(error);
        return {ok:false,changed:false};
      } finally { requests.delete(controller); }
    })().finally(() => {
      // A late completion belongs to its own generation, never a newer read.
      if (readController === controller) { readController = null; readPromise = null; }
    });
    return readPromise;
  }
  async function discardPendingAndReload() {
    if (disposed || writePromise || reloadInFlight) return {ok:false,changed:false};
    reloadInFlight = true;
    cancelDebounce();
    cancelRead();
    const requestVersion = changeVersion, controller = request();
    try {
      const result = await repository.loadOwnerSnapshot({signal:controller.signal});
      if (disposed || changeVersion !== requestVersion || writePromise) return {ok:false,changed:false};
      if (!Number.isSafeInteger(result?.revision) || result.revision < revision) throw Object.assign(Error(),{code:'INVALID_RESPONSE'});
      // Keep the local draft until a replacement is actually available.
      const oldPending = pending, oldRevision = revision;
      pending = null; revision = result.revision; ++changeVersion;
      try { onSnapshot(clone(result.snapshot)); }
      catch (error) {
        // Preserve any newer edit queued by the consumer, including on failure.
        if (!pending) { pending = oldPending; revision = oldRevision; }
        throw error;
      }
      if (!pending && !disposed) status('saved');
      return {ok:true,changed:true};
    } catch (error) {
      if (!disposed && requestVersion === changeVersion) failed(error);
      return {ok:false,changed:false};
    } finally { requests.delete(controller); reloadInFlight = false; }
  }
  function retry() {
    if (disposed || errorCode === 'CONFLICT') return Promise.resolve({ok:false,...getState()});
    return pending ? flush() : refresh();
  }
  // Hidden tabs must not repeatedly download full owner snapshots. A visible
  // transition revalidates immediately; pending drafts still use CAS on save.
  const onActivity = () => { if (isVisible()) markInteraction(); };
  const onFocus = () => { if (isVisible()) { markInteraction(); void refresh(); } };
  const onVisibility = () => { if (isVisible()) { markInteraction(); void refresh(); } };
  const onPoll = () => {
    if (!isVisible() || !isOnline()) return;
    // Never delay error recovery, pending writes, or interactive revalidation.
    // Idle backoff skips only clean, unchanged full-snapshot reads.
    const quiet = state === 'saved' && !pending && !writePromise && !errorCode &&
      now() - lastInteractionAt >= idleAfterMs;
    if (quiet && now() - lastReadAt < idlePollMs) return;
    void refresh();
  };
  const onOnline = () => {
    if (pending) void retry();
    else if (isVisible()) { markInteraction(); void refresh(); }
  };
  const onOffline = () => { if (pending) status('offline','NETWORK'); };
  eventTarget?.addEventListener?.('pointerdown',onActivity);
  eventTarget?.addEventListener?.('keydown',onActivity);
  eventTarget?.addEventListener?.('focus',onFocus);
  eventTarget?.addEventListener?.('online',onOnline);
  eventTarget?.addEventListener?.('offline',onOffline);
  visibilityTarget?.addEventListener?.('visibilitychange',onVisibility);
  if (pollMs > 0) pollTimer = pollScheduler.setInterval(onPoll,pollMs);
  function dispose() {
    if (disposed) return;
    disposed = true; cancelDebounce(); cancelRead(); if(pollTimer!==null)pollScheduler.clearInterval(pollTimer);
    eventTarget?.removeEventListener?.('pointerdown',onActivity);
    eventTarget?.removeEventListener?.('keydown',onActivity);
    eventTarget?.removeEventListener?.('focus',onFocus);
    eventTarget?.removeEventListener?.('online',onOnline);
    eventTarget?.removeEventListener?.('offline',onOffline);
    visibilityTarget?.removeEventListener?.('visibilitychange',onVisibility);
    for (const controller of requests) controller.abort();
    requests.clear(); pending = null; ++changeVersion; state = 'disposed'; errorCode = null;
  }
  return {queue,queueOwned,flush,refresh,retry,discardPendingAndReload,getState,
    getPendingSnapshot:() => pending ? clone(pending.snapshot) : null,dispose};
}
