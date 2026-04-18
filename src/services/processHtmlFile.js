import { parseTradesFromHtml } from "../domain/parser/parseTradesHtml.js";

export async function processHtmlFile(file) {
  const text = await file.text();
  const trades = parseTradesFromHtml(text);
  return trades;
}
