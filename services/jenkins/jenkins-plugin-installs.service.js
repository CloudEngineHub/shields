import Joi from 'joi'
import { renderDownloadsBadge } from '../downloads.js'
import { nonNegativeInteger } from '../validators.js'
import { BaseJsonService, NotFound, pathParams } from '../index.js'

const schemaInstallations = Joi.object()
  .keys({
    installations: Joi.object()
      .required()
      .pattern(nonNegativeInteger, nonNegativeInteger)
      .min(1),
  })
  .required()

const schemaInstallationsPerVersion = Joi.object()
  .keys({
    installationsPerVersion: Joi.object()
      .required()
      .pattern(Joi.string(), nonNegativeInteger)
      .min(1),
  })
  .required()

export default class JenkinsPluginInstalls extends BaseJsonService {
  static category = 'downloads'

  static route = {
    base: 'jenkins/plugin/i',
    pattern: ':plugin/:version?',
  }

  static openApi = {
    '/jenkins/plugin/i/{plugin}': {
      get: {
        summary: 'Jenkins Plugin installs',
        parameters: pathParams({
          name: 'plugin',
          example: 'view-job-filters',
        }),
      },
    },
    '/jenkins/plugin/i/{plugin}/{version}': {
      get: {
        summary: 'Jenkins Plugin installs (version)',
        parameters: pathParams(
          {
            name: 'plugin',
            example: 'view-job-filters',
          },
          {
            name: 'version',
            example: '1.26',
          },
        ),
      },
    },
  }

  static defaultBadgeData = { label: 'installs' }

  static render({ installs: downloads, version }) {
    return renderDownloadsBadge({
      downloads,
      versionedLabelPrefix: 'installs',
      version,
    })
  }

  async fetch({ plugin, version }) {
    return this._requestJson({
      url: `https://old.stats.jenkins.io/plugin-installation-trend/${plugin}.stats.json`,
      schema: version ? schemaInstallationsPerVersion : schemaInstallations,
      httpErrors: {
        404: 'plugin not found',
      },
    })
  }

  static transform({ json, version }) {
    if (!version) {
      const latestDate = Object.keys(json.installations).sort().slice(-1)[0]
      return { installs: json.installations[latestDate] }
    }

    const installs = json.installationsPerVersion[version]
    if (!installs) {
      throw new NotFound({
        prettyMessage: 'version not found',
      })
    }
    return { installs }
  }

  async handle({ plugin, version }) {
    const json = await this.fetch({ plugin, version })
    const { installs } = this.constructor.transform({ json, version })
    return this.constructor.render({ installs, version })
  }
}
