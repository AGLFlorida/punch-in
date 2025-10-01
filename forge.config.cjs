module.exports = {
  packagerConfig: {},
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32', 'linux']
    },
    {
      name: '@electron-forge/maker-dmg',
      config: { overwrite: true }
    }
  ]
};