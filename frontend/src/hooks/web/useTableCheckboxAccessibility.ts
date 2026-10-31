import { onBeforeUnmount, watch } from 'vue'

/** Element Plus puts mixed state on a label; the native input already owns indeterminate state. */
export const useTableCheckboxAccessibility = (element: () => HTMLElement | undefined) => {
  let observer: MutationObserver | undefined
  watch(
    element,
    (root) => {
      observer?.disconnect()
      if (!root) return
      const correctLabels = () => {
        for (const label of root.querySelectorAll('label.el-checkbox[aria-checked]')) {
          if (label.querySelector('input[type="checkbox"]')) label.removeAttribute('aria-checked')
        }
      }
      correctLabels()
      observer = new MutationObserver(correctLabels)
      observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['aria-checked']
      })
    },
    { immediate: true, flush: 'post' }
  )
  onBeforeUnmount(() => observer?.disconnect())
}
