import { createElement } from "react";
const component = (tag: string) => ({ children, ...props }: any) => createElement(tag, props, children);
export const View = component("div");
export const Text = component("span");
export const Button = component("button");
export const Image = ({ mode, style, ...props }: any) => createElement("img", {
  ...props, style: { ...style, objectFit: mode === "aspectFill" ? "cover" : mode === "aspectFit" ? "contain" : "fill" }
});
const field = (tag: string) => ({ onInput, maxlength, ...props }: any) => createElement(tag, {
  ...props, ...(maxlength >= 0 ? { maxLength: maxlength } : {}), onInput: (e: any) => onInput?.({ detail: { value: e.target.value } }), onChange: () => {}
});
export const Input = field("input");
export const Textarea = field("textarea");
export const Picker = ({ mode: _mode, range, value, onChange }: any) => createElement("select", {
  value, onChange: (e: any) => onChange?.({ detail: { value: e.target.value } })
}, range.map((v: string, i: number) => createElement("option", { key: v, value: i }, v)));
