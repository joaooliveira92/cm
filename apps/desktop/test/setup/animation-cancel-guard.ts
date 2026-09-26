/**
 * Stop happy-dom's animation cancellations leaking as unhandled rejections.
 *
 * happy-dom implements `Element.prototype.animate`, so `motion` drives real WAAPI animations.
 * When an animated component unmounts mid-animation, `motion` calls `Animation.cancel()`, and
 * happy-dom's `cancel()` rejects the animation's `finished` promise with
 * `AbortError: The animation was canceled.` motion attaches no handler for that promise, so every
 * unmounted animated component leaks an unhandled rejection -- dozens per renderer file, reported
 * by vitest as "Unhandled Errors" whether or not the tests pass. They bury real failures and make
 * the suite's error count meaningless.
 *
 * The fix is at the rejection, not at motion's behaviour: attaching a no-op `catch` to `finished`
 * before the original `cancel()` runs marks the rejection handled. The tests never await
 * `finished`, and happy-dom still clears its timer, sets `playState` to `idle`, and dispatches the
 * `cancel` event, so animation semantics are otherwise untouched.
 *
 * Deliberately not `MotionGlobalConfig.skipAnimations`: that changes mount/exit timing and flips
 * specs that observe a component mid-transition, which is a behaviour change this guard has no
 * business making. Nor a `process.on("unhandledRejection")` filter -- vitest installs its own
 * rejection listener, and a second listener cannot stop vitest counting what it sees.
 *
 * Renderer project only: the node project never constructs a happy-dom `Animation`.
 */
if (typeof Animation !== "undefined") {
  const originalCancel = Animation.prototype.cancel;
  Animation.prototype.cancel = function cancel(this: Animation) {
    this.finished.catch(() => undefined);
    return originalCancel.call(this);
  } as typeof Animation.prototype.cancel;
}
