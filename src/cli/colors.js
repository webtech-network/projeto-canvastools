const noColor = process.argv.includes('--no-color') || Boolean(process.env.NO_COLOR);
const colorEnabled = process.stdout.isTTY && !noColor;

function wrap(code) {
  return (text) => (colorEnabled ? `\x1b[${code}m${text}\x1b[0m` : text);
}

export const red = wrap('31');
export const green = wrap('32');
export const yellow = wrap('33');
export const cyan = wrap('36');
export const bold = wrap('1');
