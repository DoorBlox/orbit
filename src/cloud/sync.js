const clone = value => structuredClone(value);
const knownCodes = new Set(['AUTH_REQUIRED','FORBIDDEN','CONFLICT','NETWORK','VALIDATION','INVALID_RESPONSE','ABORTED']);
/** One serialized save queue per signed-in owner. Drafts never enter telemetry. */
export function createSyncController({ repository, initialRevision = 0, onSnapshot = () => {}, onStatus = () => {},
  debounceMs = 500, pollMs = 15000, eventTarget = globalThis.window,
  isOnline = () => globalThis.navigator?.onLine !== false } = {}) {
  if (!repository?.saveSnapshot || !repository?.loadOwnerSnapshot || !Number.isSafeInteger(initialRevision) || initialRevision < 0) {
    throw Error('A snapshot repository and valid initial revision are required.');
  }
  let revision = initialRevision, state = 'saved', errorCode = null;
  let pending = null, changeVersion = 0, debounceTimer = null, pollTimer = null;
  let writePromise = null, readPromise = null, disposed = false;
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
  function queue(snapshot) {
    if (disposed) return false;
    pending = {snapshot:clone(snapshot),version:++changeVersion};
    cancelDebounce();
    // A stale base version requires an explicit review, never automatic overwrite.
    if (errorCode === 'CONFLICT') { status('conflict','CONFLICT'); return true; }
    status(isOnline() ? 'pending' : 'offline', isOnline() ? null : 'NETWORK');
    debounceTimer = setTimeout(() => { void flush(); },Math.max(0,debounceMs));
    return true;
  }
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
    if (disposed || pending || writePromise || errorCode === 'CONFLICT') return Promise.resolve({ok:!disposed,changed:false});
    if (readPromise) return readPromise;
    const requestVersion = changeVersion, controller = request();
    readPromise = (async () => {
      try {
        if (!isOnline()) { status('offline','NETWORK'); return {ok:false,changed:false}; }
        const result = await repository.loadOwnerSnapshot({signal:controller.signal});
        if (disposed || changeVersion !== requestVersion || pending || writePromise) return {ok:false,changed:false};
        if (!Number.isSafeInteger(result?.revision) || result.revision < revision) throw Object.assign(Error(),{code:'INVALID_RESPONSE'});
        const changed = result.revision > revision;
        if (changed) { revision = result.revision; onSnapshot(clone(result.snapshot)); }
        status('saved');
        return {ok:true,changed};
      } catch (error) {
        if (!disposed && changeVersion === requestVersion && !pending) failed(error);
        return {ok:false,changed:false};
      } finally { requests.delete(controller); }
    })().finally(() => { readPromise = null; });
    return readPromise;
  }
  async function discardPendingAndReload() {
    if (disposed || writePromise) return {ok:false,changed:false};
    cancelDebounce();
    const requestVersion = changeVersion, controller = request();
    try {
      const result = await repository.loadOwnerSnapshot({signal:controller.signal});
      if (disposed || changeVersion !== requestVersion || writePromise) return {ok:false,changed:false};
      if (!Number.isSafeInteger(result?.revision) || result.revision < revision) throw Object.assign(Error(),{code:'INVALID_RESPONSE'});
      // Keep the local draft until a replacement is actually available.
      onSnapshot(clone(result.snapshot));
      pending = null; revision = result.revision; ++changeVersion;
      status('saved');
      return {ok:true,changed:true};
    } catch (error) {
      if (!disposed && requestVersion === changeVersion) failed(error);
      return {ok:false,changed:false};
    } finally { requests.delete(controller); }
  }
  function retry() {
    if (disposed || errorCode === 'CONFLICT') return Promise.resolve({ok:false,...getState()});
    return pending ? flush() : refresh();
  }
  const onFocus = () => { void refresh(); };
  const onOnline = () => { void retry(); };
  const onOffline = () => { if (pending) status('offline','NETWORK'); };
  eventTarget?.addEventListener?.('focus',onFocus);
  eventTarget?.addEventListener?.('online',onOnline);
  eventTarget?.addEventListener?.('offline',onOffline);
  if (pollMs > 0) pollTimer = setInterval(onFocus,pollMs);
  function dispose() {
    if (disposed) return;
    disposed = true; cancelDebounce(); clearInterval(pollTimer);
    eventTarget?.removeEventListener?.('focus',onFocus);
    eventTarget?.removeEventListener?.('online',onOnline);
    eventTarget?.removeEventListener?.('offline',onOffline);
    for (const controller of requests) controller.abort();
    requests.clear(); pending = null; ++changeVersion; state = 'disposed'; errorCode = null;
  }
  return {queue,flush,refresh,retry,discardPendingAndReload,getState,
    getPendingSnapshot:() => pending ? clone(pending.snapshot) : null,dispose};
}
