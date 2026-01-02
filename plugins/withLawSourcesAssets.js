const { withAppBuildGradle } = require('@expo/config-plugins');

const TASK_NAME = 'copyLawSources';

function addCopyTask(contents) {
  if (contents.includes(TASK_NAME)) {
    return contents;
  }

  const taskBlock = `

// Copies PDFs into Android assets so react-native-pdf can read them offline.
task ${TASK_NAME}(type: Copy) {
    def sourceDir = "\${rootDir}/../law_sources"
    def targetDir = "\${projectDir}/src/main/assets/law_sources"
    doFirst {
        if (!file(sourceDir).exists()) {
            throw new GradleException("law_sources not found at: " + sourceDir)
        }
        println("Copying law_sources from " + sourceDir + " to " + targetDir)
    }
    from(sourceDir)
    into(targetDir)
}

preBuild.dependsOn(${TASK_NAME})
`;

  return contents + taskBlock;
}

module.exports = function withLawSourcesAssets(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = addCopyTask(config.modResults.contents);
    return config;
  });
};
