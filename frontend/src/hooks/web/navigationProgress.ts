interface ProgressPort {
  configure(options: Record<string, unknown>): unknown
  start(): unknown
  done(): unknown
}

/** Adapt the library's visual selectors without using its invalid ARIA roles. */
export function createNavigationProgress(progress: ProgressPort, root: Document) {
  const updateLabel = (label: string) => {
    root.querySelector('#nprogress [data-rain-progress-bar]')?.setAttribute('aria-label', label)
  }
  const start = (label: string) => {
    const escaped = label.replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!
    )
    progress.configure({
      showSpinner: false,
      barSelector: '[data-rain-progress-bar]',
      spinnerSelector: '[data-rain-progress-spinner]',
      // No aria-valuenow: route completion is indeterminate, not a measured percentage.
      template: `<div role="status" aria-live="polite"><div class="bar" data-rain-progress-bar role="progressbar" aria-label="${escaped}" aria-valuemin="0" aria-valuemax="100"><div class="peg"></div></div></div><div class="spinner" data-rain-progress-spinner aria-hidden="true"><div class="spinner-icon"></div></div>`
    })
    progress.start()
    updateLabel(label)
  }
  return { start, updateLabel, done: () => progress.done() }
}
