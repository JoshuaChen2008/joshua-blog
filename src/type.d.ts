declare module 'virtual:config' {
  const Config: import('astro-pure/types').ConfigOutput
  export default Config
}

interface ImportMetaEnv {
  readonly PUBLIC_WALINE_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
