export function composeCodePage(shell, main) {
  const marker = '__KTK_PAGE_MAIN_CONTENT__';
  if (shell.split(marker).length !== 2) throw new Error('Expected exactly one content slot');
  // A callback preserves literal dollar signs in captured prices/budget labels.
  return shell.replace(marker, () => main);
}
