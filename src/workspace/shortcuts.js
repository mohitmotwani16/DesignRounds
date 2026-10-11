// Keyboard shortcuts shown in the help dialog. The handler lives in Workspace.jsx;
// keep the two in sync when adding a shortcut.
export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

export const shortcutGroups = [
  {
    title: "General",
    items: [
      [["?"], "Show keyboard shortcuts"],
      [["/"], "Search components"],
      [["P"], "Open the brief"],
      [[mod, "S"], "Save now"],
      [["Esc"], "Clear selection or close a dialog"],
    ],
  },
  {
    title: "Move around",
    items: [
      [["Drag"], "Pan the canvas"],
      [["Scroll"], "Zoom in and out"],
      [["+"], "Zoom in"],
      [["-"], "Zoom out"],
      [["0"], "Zoom to 100%"],
      [["F"], "Fit the whole design in view"],
    ],
  },
  {
    title: "Select & edit",
    items: [
      [["Shift", "Drag"], "Select several items"],
      [[mod, "A"], "Select everything"],
      [["Enter"], "Rename the selected component"],
      [["↑", "↓", "←", "→"], "Nudge selection (hold Shift for bigger steps)"],
      [["Delete"], "Delete selection"],
      [[mod, "D"], "Duplicate"],
      [[mod, "C"], "Copy"],
      [[mod, "X"], "Cut"],
      [[mod, "V"], "Paste"],
      [[mod, "Z"], "Undo"],
      [[mod, "Shift", "Z"], "Redo"],
    ],
  },
  {
    title: "Add to the canvas",
    items: [
      [["S"], "Service"],
      [["G"], "Zone / boundary"],
      [["T"], "Text label"],
      [["N"], "Decision note"],
    ],
  },
  {
    title: "Panels",
    items: [
      [["B"], "Show or hide the component library"],
      [["I"], "Show or hide the interviewer"],
      [["M"], "Show or hide the minimap"],
    ],
  },
];
