const fs = require('node:fs')
const path = require('node:path')
const { globSync } = require('glob')
const yaml = require('js-yaml')

const { belongs, tag2commit } = require('./validate-git')
const { isCommitHash } = require('./isgit')
const { checksum } = require('./ignore')

const defaultDir = path.join(process.cwd(), '.github')

const sortErrors = (errors) => {
  errors.forEach((result) => {
    result.id = `${result.action}:${checksum(result.files.join() + result.message)}`
  })
  return errors.sort((a, b) => a.id.localeCompare(b.id))
}

exports.validateWorkflows = async function (workflowsDir = defaultDir) {
  const actions = new Map()
  const info = []
  const errors = []

  // Find all workflow files in the .github directory
  const files = globSync(`${workflowsDir}/**/*.yml`)

  files.forEach((file) => {
    const fileContent = fs.readFileSync(file, 'utf8')
    let workflow
    try {
      workflow = yaml.load(fileContent)
    } catch (e) {
      info.push(`Warning: Error loading YAML file ${file}:`, e)
      return
    }

    if (workflow.jobs) {
      Object.values(workflow.jobs).forEach((job) => {
        if (job.steps) {
          job.steps.forEach((step) => {
            if (step.uses) {
              if (actions.has(step.uses)) {
                const ac = actions.get(step.uses)
                ac.add(file)
              } else {
                actions.set(step.uses, new Set([file]))
              }
            }
          })
        }
      })
    }
  })

  info.push(
    `Found ${actions.size} actions in ${files.length} workflow files in ${workflowsDir}`
  )

  for (const [actionSpecifier, files] of actions.entries()) {
    const [action, version] = actionSpecifier.split('@')
    const [owner, repo] = action.split('/')

    // check whether version is a commit hash
    if (!isCommitHash(version)) {
      let tagConversionTip = ''
      try {
        const info = await tag2commit(owner, repo, version)
        if (info.commit) {
          if (info.isTag) {
            tagConversionTip = `use: ${action}@${info.commit} #${version}`
          } else {
            tagConversionTip = `the commit hash under ${version} is ${info.commit} but doublecheck if that's what you wanted`
          }
        }
      } catch (e) {
        info.push(`Warning: Error looking up ${actionSpecifier}`, e)
      }

      errors.push({
        message: `Action specifiers must use a commit hash.
          expected: ${action}@COMMITHASH_40_CHARACTERS_LONG
          actual: ${actionSpecifier}
          ${tagConversionTip}
          `,
        files: [...files],
        action,
      })
      continue
    }
    if (!(await belongs(owner, repo, version))) {
      errors.push({
        message: `The commit hash in ${actionSpecifier} does not seem to belong to the repository ${owner}/${repo}.
          `,
        files: [...files],
        action,
      })
    }
  }

  sortErrors(errors)

  return {
    errors,
    info,
  }
}
