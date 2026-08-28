/**
 * NATIVE pair of useExitTransition.web. Native reveals run through
 * `useRevealStyle` timers and complete on the lifecycle's `exitMs` budget,
 * so there is no platform completion signal to reconcile — this is a no-op
 * kept for module resolution and shared typing.
 */
export function useExitTransition(): void {}
