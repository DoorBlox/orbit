const clone = value => structuredClone(value);
const knownCodes = new Set(['AUTH_REQUIRED','FORBIDDEN','CONFLICT','NETWORK','VALIDATION','INVALID_RESPONSE','ABORTED']);
/** One serialized save queue per signed-in owner. Drafts never enter telemetry. */
export function createSyncController({ repository, initialRevision = 0, onSnapshot = () => {}, onStatus = () => {},
  debounceMs = 500, pollMs = 15000,
  // Clean, unchanged foreground workspaces poll at 30 s after 2 min without
  // interaction; active typing/pointer use keeps the existing 15 s cadence.
  // A second device may take up to 30 s to appear while this tab is idle.
  idleAfterMs = 120000, idlePollMs = 30000,
  // A transport that ignores AbortSignal must not pin every subsequent poll.
  // A 45-second age budget is conservative relative to 15/30-second polling.
  maxReadAgeMs = 45000,
  // Browser focus and visibilitychange may fire back-to-back after a fast RPC.
  // Real hidden-to-visible transitions always revalidate immediately.
  foregroundMinGapMs = 2000,
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
      !Number.isFinite(idlePollMs) || idlePollMs < Math.max(0,pollMs) ||
      !Number.isFinite(maxReadAgeMs) || maxReadAgeMs < Math.max(0,pollMs) ||
      !Number.isFinite(foregroundMinGapMs) || foregroundMinGapMs < 0) {
    throw Error('Invalid idle poll timing or clock.');
  }
  const startedAt = now();
  if (!Number.isFinite(startedAt)) throw Error('Invalid idle poll clock.');
  let lastInteractionAt = startedAt, lastReadAt = startedAt;
  let lastForegroundWakeAt = -Infinity, wasForegroundVisible = isVisible();
  // Track a genuine offline edge separately from browser online-event noise.
  // It must force a new owner read even inside the short wake coalescing gap.
  let offlineSinceWake = false;
  const markInteraction = () => { lastInteractionAt = now(); };
  let revision = initialRevision, state = 'saved', errorCode = null;
  let pending = null, changeVersion = 0, debounceTimer = null, pollTimer = null;
  let writePromise = null, readPromise = null, readController = null, readStartedAt = null;
  let reloadInFlight = false, disposed = false;
  // Transient network failures with navigator.onLine still true may never
  // produce another 'online' event. Poll-time retries are bounded and only
  // operate on retained dirty drafts; conflicts and Auth errors stay manual.
  let networkRetryFailures = 0, nextNetworkRetryAt = -Infinity;
  // Permit one immediate retry on a genuine reconnect; repeated online events
  // must not bypass subsequent bounded NETWORK backoff or repeat denied writes.
  let eagerReconnectUsed = false;
  const resetNetworkRetry = () => { networkRetryFailures = 0; nextNetworkRetryAt = -Infinity; eagerReconnectUsed = false; };
  function scheduleNetworkRetry() {
    networkRetryFailures = Math.min(networkRetryFailures + 1, 8);
    const base = Math.max(15000, pollMs);
    nextNetworkRetryAt = now() + Math.min(120000, base * (2 ** (networkRetryFailures - 1)));
  }
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
    readStartedAt = null;
    obsolete?.abort();
    if (obsolete) requests.delete(obsolete);
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
    resetNetworkRetry();
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
        resetNetworkRetry();
        if (pending?.version === saving.version) pending = null;
      } catch (error) {
        if (!disposed) {
          failed(error);
          if (errorCode === 'NETWORK') scheduleNetworkRetry();
          else resetNetworkRetry();
        }
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
    if (readPromise) {
      if (now() - readStartedAt < maxReadAgeMs) return readPromise;
      // The old promise might NEVER settle. Detach first, then retry; its
      // controller identity gate prevents a late response changing the view.
      cancelRead();
    }
    const requestVersion = changeVersion, controller = request();
    readController = controller;
    readStartedAt = now();
    readPromise = (async () => {
      try {
        if (!isOnline()) { status('offline','NETWORK'); return {ok:false,changed:false}; }
        lastReadAt = now();
        // The repository may skip CPU-heavy normalization when this already-loaded
        // CAS revision is unchanged. The existing RPC still transfers full JSON.
        const result = await repository.loadOwnerSnapshot({signal:controller.signal,knownRevision:revision});
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
      if (readController === controller) { readController = null; readPromise = null; readStartedAt = null; }
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
  const onWake = () => {
    const visible = isVisible();
    if (!visible) { wasForegroundVisible = false; return; }
    markInteraction();
    const current = now(), newlyVisible = !wasForegroundVisible;
    wasForegroundVisible = true;
    if (!newlyVisible && current - lastForegroundWakeAt < foregroundMinGapMs) return;
    lastForegroundWakeAt = current;
    void refresh();
  };
  const onFocus = onWake;
  const onVisibility = onWake;
  const onPoll = () => {
    if (!isVisible() || !isOnline()) return;
    // A failed authenticated write stays local until CAS save succeeds or the
    // owner resolves a conflict. Reconnect can happen without an online event.
    if (pending) {
      if (errorCode === 'NETWORK' && !writePromise && now() >= nextNetworkRetryAt) void flush();
      return;
    }
    // Never delay error recovery, pending writes, or interactive revalidation.
    // Idle backoff skips only clean, unchanged full-snapshot reads.
    const quiet = state === 'saved' && !pending && !writePromise && !errorCode &&
      now() - lastInteractionAt >= idleAfterMs;
    if (quiet && now() - lastReadAt < idlePollMs) return;
    void refresh();
  };
  const onOnline = () => {
    if (!isOnline()) return;
    const current = now();
    if (pending) {
      // A successful dirty reconnect should not be followed by a storm of
      // clean reads from duplicate browser online notifications.
      offlineSinceWake = false;
      lastForegroundWakeAt = current;
      // Auth, validation and conflicts require owner action, not an online event.
      if (errorCode && errorCode !== 'NETWORK') return;
      if (errorCode === 'NETWORK') {
        if (eagerReconnectUsed && current < nextNetworkRetryAt) return;
        eagerReconnectUsed = true;
      }
      void retry();
    } else if (isVisible()) {
      // Share the existing foreground gap with focus/visibility events.
      // A confirmed offline edge overrides it, as does a real visible return
      // through onWake's newly-visible branch.
      if (!offlineSinceWake && current - lastForegroundWakeAt < foregroundMinGapMs) return;
      offlineSinceWake = false;
      lastForegroundWakeAt = current;
      markInteraction();
      void refresh();
    }
  };
  const onOffline = () => {
    offlineSinceWake = true;
    if (pending) status('offline','NETWORK');
  };
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
