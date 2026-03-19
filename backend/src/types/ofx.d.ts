declare module 'ofx' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parse(data: string): any;
  export = { parse };
}
