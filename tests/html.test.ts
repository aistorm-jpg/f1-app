import { expect, test } from "bun:test";
import { html, markup } from "../src/ui/html.ts";

test("tekst fra API'en escapes, men indlejret html gør ikke", () => {
  const name = `Antonelli <script>alert("x")</script>`;
  const view = markup(
    html`<p>${name}</p>
      ${html`<em>${"ok"}</em>`}`,
  );
  const flat = (value: string) => value.replaceAll(/\s+/g, "");
  expect(flat(view)).toBe(
    flat(`<p>Antonelli &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p><em>ok</em>`),
  );
});
