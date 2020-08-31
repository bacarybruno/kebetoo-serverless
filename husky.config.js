module.exports = {
  hooks: {
    // 'pre-commit': 'yarn test services --silent',
    'commit-msg': 'commitlint -E HUSKY_GIT_PARAMS',
  },
}
