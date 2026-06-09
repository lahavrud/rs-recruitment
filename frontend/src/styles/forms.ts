export const inputCls =
  "block w-full rounded-sm border border-white/10 bg-well px-3 py-2.5 text-sm text-white/85 sm:py-3 sm:text-base " +
  "placeholder:text-white/20 focus:border-copper/50 focus:ring-1 focus:ring-copper/20 focus:outline-none";

export const textareaCls = `${inputCls} resize-y`;

export const selectCls = inputCls;

// Ghost variants: content-like at rest, reveal as inputs on hover/focus.
// Use -mx-1.5 + px-1.5 so the field aligns flush with surrounding text.
export const ghostInputCls =
  "-mx-1.5 block w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 " +
  "text-sm text-white/80 placeholder:text-white/25 outline-none transition " +
  "hover:border-white/10 hover:bg-white/3 focus:border-copper/30 focus:bg-white/4";

