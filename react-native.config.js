module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android/app',
        packageImportPath: 'import one.telefon.headless.HeadlessPackage;',
        packageInstance: 'new HeadlessPackage()',
      },
    },
  },
};
