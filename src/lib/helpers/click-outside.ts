import type { ActionReturn } from "svelte/action"

/** Dispatch event on click outside of node */
export function clickOutside(node: HTMLElement): ActionReturn {
  const handleClick = (event: MouseEvent) => {
    if (node && !node.contains(event.target as Node | null) && !event.defaultPrevented) {
      node.dispatchEvent(new CustomEvent("click_outside"))
    }
  }

  document.addEventListener("click", handleClick, true)

  return {
    destroy() {
      document.removeEventListener("click", handleClick, true)
    }
  }
}
