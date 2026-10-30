import { test, expect } from 'playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fixtureApi } from './fixtures.mjs'
import { waitForFixtureSelection } from './overlays.mjs'

for (const reduced of [false, true]) {
  test(`shared dialog entry readiness respects ${reduced ? 'reduced' : 'normal'} motion`, async ({
    page
  }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
    await fixtureApi(page, true)
    const base = process.env.RAIN_BROWSER_BASE_URL || 'http://127.0.0.1:4174'
    await page.goto(`${base}/tests/components/index.html`)
    // Hold the actual CSS entrance so the event/scan boundary is deterministic.
    await page.addStyleTag({
      content: `
      .dialog-fade-enter-active, .dialog-fade-enter-active .el-overlay-dialog {
        animation-duration: 100s !important;
        animation-play-state: paused !important;
      }
    `
    })
    await page.getByRole('button', { name: 'Open selection fixture' }).click()
    const dialog = page.locator('.rain-table-select')
    await expect(dialog.getByText('عميل Test 001')).toBeVisible()
    const entered = page.locator('output[aria-label="Fixture selection entered"]')
    if (!reduced) {
      await expect(entered).toHaveText('false')
      const opacity = await dialog.evaluate((element) => {
        const overlay = element.closest('.el-overlay')
        for (const animation of overlay
          .getAnimations({ subtree: true })
          .filter(
            (item) =>
              item instanceof CSSAnimation &&
              ['modal-fade-in', 'dialog-fade-in'].includes(item.animationName)
          )) {
          const duration = animation.effect.getComputedTiming().duration
          if (typeof duration === 'number' && Number.isFinite(duration))
            animation.currentTime = duration / 2
        }
        return Number(getComputedStyle(overlay).opacity)
      })
      expect(opacity).toBeGreaterThan(0)
      expect(opacity).toBeLessThan(1)
      let ready = false
      const waiting = waitForFixtureSelection(page, dialog).then(() => {
        ready = true
      })
      await expect(entered).toHaveText('false')
      expect(ready).toBe(false)
      await dialog.evaluate((element) => {
        const animations = element
          .closest('.el-overlay')
          .getAnimations({ subtree: true })
          .filter(
            (item) =>
              item instanceof CSSAnimation &&
              ['modal-fade-in', 'dialog-fade-in'].includes(item.animationName)
          )
        for (const animation of animations.reverse()) animation.finish()
      })
      await waiting
    } else {
      await waitForFixtureSelection(page, dialog)
      expect(
        await dialog.evaluate(
          (element) => element.closest('.el-overlay').getAnimations({ subtree: true }).length
        )
      ).toBe(0)
    }
    const result = await new AxeBuilder({ page }).include('.rain-table-select').analyze()
    expect(result.violations).toEqual([])
  })
}
