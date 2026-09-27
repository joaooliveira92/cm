/**
 * A photograph behind a container, treated so text over it stays readable.
 *
 * Fills the nearest positioned ancestor — the caller marks it `relative isolate`, and `isolate`
 * keeps the `-z-10` layer behind that container's content without dropping it behind the page.
 * The photo is an `<img>` with `object-cover`, so any source proportion (a portrait twice as tall
 * as it is wide, an ultra-wide panorama) fills the box without distortion and crops the overflow
 * evenly from both sides. The treatment — desaturate, darken, blur, chrome-blue wash, dark
 * vertical fade — lives in the `backdrop-photo` / `backdrop-wash` utilities in `index.css`, so a
 * skin override retunes it without touching this file.
 *
 * Renders nothing for a null source, which leaves the container's own dark base showing.
 */
export const Backdrop = ({ src }: { readonly src: string | null }) =>
  src === null ? null : (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-bg-base">
      <img src={src} alt="" decoding="async" draggable={false} className="backdrop-photo size-full object-cover" />
      <div className="backdrop-wash absolute inset-0" />
    </div>
  );
