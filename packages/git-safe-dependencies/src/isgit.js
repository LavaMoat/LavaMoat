const gitinfo = require('hosted-git-info')

const gitUrlRegex =
  /^(git\+https?:\/\/|github:|git:\/\/|https:\/\/([a-z]+\.)*github\.com|git\+ssh:\/\/git@|git@)/i

// yarn classic uses these in lockfiles
const isCodeloadUrl = (url) => url.startsWith('https://codeload.github.com/')
const isUnsafeUrl = (url) =>
  url.startsWith('git+http://') || url.startsWith('http://')

const isGitUrl = (url) => gitUrlRegex.test(url)
const isGHRepoSpecifier = (specifier) =>
  specifier.startsWith('github:') || specifier.match(/^[^/]+\/[^/]+/)

exports.isGitUrl = isGitUrl
exports.isGitSpecifier = (specifier) =>
  isGitUrl(specifier) || isGHRepoSpecifier(specifier)
exports.isUnsafeUrl = isUnsafeUrl

exports.isCodeloadUrl = isCodeloadUrl
exports.gitInfo = (url) => {
  if (isUnsafeUrl(url)) {
    url = url.replace('http:', 'https:')
  }
  if (isCodeloadUrl(url)) {
    //example: "https://codeload.github.com/aprock/react-native-tcp/tar.gz/98fbc801f0586297f16730b2f4c75eef15dfabcd"
    url = url
      .replace('https://codeload.github.com/', 'git://github.com/')
      .replace('/tar.gz/', '.git#')
  }
  const info = gitinfo.fromUrl(url)

  return info
}