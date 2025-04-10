import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'PetiRahsia',
    description: 'A secure password-protected storage for your important text snippets and notes. Keep your sensitive information safe and easily accessible.',
    permissions: ['storage'],
    icons: {
      16: 'icon/16x16.png',
      32: 'icon/32x32.png',
      48: 'icon/48x48.png',
      96: 'icon/96x96.png',
      128: 'icon/128x128.png'
    }
  },
});
