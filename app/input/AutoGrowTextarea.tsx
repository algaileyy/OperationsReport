"use client";

import { useEffect, useRef, type TextareaHTMLAttributes } from "react";

/** A textarea that grows to fit its content instead of staying a fixed size with an internal
 * scrollbar — resizes on every keystroke, and whenever its value changes for any other reason
 * (switching months, an AI draft filling it in), so nobody has to drag the resize handle just to
 * see what they already wrote. */
export default function AutoGrowTextarea({
  value,
  style,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      style={{ ...style, overflow: "hidden", resize: "none" }}
      {...rest}
    />
  );
}
