import { expect } from 'playwright/test'

export const waitForOverlaySettled = async (dialog) => {
  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const overlay = element.closest('.el-overlay') || element
        const finiteMotion = overlay
          .getAnimations({ subtree: true })
          .some(
            (animation) =>
              animation.effect?.getComputedTiming().iterations !== Infinity &&
              !['finished', 'idle'].includes(animation.playState)
          )
        let current = element
        while (current) {
          if (Number(getComputedStyle(current).opacity) !== 1) return false
          if (current === overlay) break
          current = current.parentElement
        }
        return !finiteMotion
      })
    )
    .toBe(true)
}

export const waitForFixtureSelection = async (page, dialog) => {
  // The real Element Plus opened event marks entry; visibility alone includes fade frames.
  await expect(page.locator('output[aria-label="Fixture selection entered"]')).toHaveText('true')
  await waitForOverlaySettled(dialog)
}
