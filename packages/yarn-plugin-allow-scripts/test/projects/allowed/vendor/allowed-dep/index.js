require('fs').writeFileSync(
  process.env.FOOWRITER_DEST ?? 'foo',
  process.env.FOOWRITER_CONTENT ?? 'FOO',
);
console.log(process.env.FOOWRITER_CONTENT ?? 'FOO');
