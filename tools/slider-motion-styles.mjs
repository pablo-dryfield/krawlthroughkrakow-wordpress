import {readFile, writeFile} from 'node:fs/promises';

export async function buildSliderMotionStyles(file) {
  const source = await readFile(file, 'utf8'), styles = await readFile(new URL('./slider-motion.css', import.meta.url), 'utf8'), start = '/* BEGIN reduced-motion slide content */', end = '/* END reduced-motion slide content */', anchor = '/* END Memorial visitor guide */\n\n';
  if (!source.startsWith('/* BEGIN Memorial visitor guide */\n') || source.split(anchor).length !== 2) throw Error('Preserve leading Memorial stylesheet');
  if (source.includes(start) || source.includes(end)) {
    if (!source.includes(anchor + styles) || source.split(start).length !== 2 || source.split(end).length !== 2) throw Error('Reduced-motion stylesheet drift');
    return;
  }
  await writeFile(file, source.replace(anchor, anchor + styles));
}
