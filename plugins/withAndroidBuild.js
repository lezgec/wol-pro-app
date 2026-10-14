const { withAndroidManifest, withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const windowsBuild = `
    // WoL Pro Windows native build: short CMake paths for Ninja.
    if (System.getProperty('os.name').toLowerCase().contains('windows')) {
        defaultConfig {
            externalNativeBuild {
                cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=240" }
            }
        }
        externalNativeBuild {
            cmake {
                buildStagingDirectory new File(System.getProperty('user.home'), ".cxx/wolpro")
            }
        }
    }
`;

module.exports = function withAndroidBuild(config) {
  config = withAndroidManifest(config, config => {
    const permission = 'com.google.android.gms.permission.AD_ID';
    // Non-clean prebuild keeps the removal marker from an earlier off build.
    // Explicitly undo it only when the current build permits advertising IDs.
    if (!config.android?.blockedPermissions?.includes(permission)) {
      const manifest = config.modResults.manifest;
      const entries = (manifest['uses-permission'] || []).filter(item => !(item.$['android:name'] === permission && item.$['tools:node'] === 'remove'));
      if (!entries.some(item => item.$['android:name'] === permission)) entries.push({ $: { 'android:name': permission } });
      manifest['uses-permission'] = entries;
    }
    return config;
  });
  config = withGradleProperties(config, config => {
    const properties = config.modResults;
    const jvm = properties.find(item => item.type === 'property' && item.key === 'org.gradle.jvmargs');
    if (jvm) jvm.value = '-Xmx3072m -XX:MaxMetaspaceSize=1024m';
    else properties.push({ type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx3072m -XX:MaxMetaspaceSize=1024m' });
    return config;
  });
  return withAppBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') throw new Error('WoL Pro requires a Groovy Android app build.gradle.');
    if (!config.modResults.contents.includes('// WoL Pro Windows native build:')) {
      if (!/^android\s*\{/m.test(config.modResults.contents)) throw new Error('Android configuration block was not found.');
      config.modResults.contents = config.modResults.contents.replace(/^android\s*\{/m, match => match + windowsBuild);
    }
    return config;
  });
};
