import { hopArt, printHopArt } from './shared/art'
import { logger, program } from './shared'
import {
  setGlobalConfigFromConfigFile,
  Config,
  parseConfigFile,
  defaultEnabledWatchers,
  defaultEnabledNetworks
} from './shared/config'
import clearDb from 'src/db/clearDb'
import db from 'src/db'
import {
  getStakeWatchers,
  startWatchers,
  startStakeWatchers,
  startChallengeWatchers,
  startCommitTransferWatchers
} from 'src/watchers/watchers'
import xDaiBridgeWatcher from 'src/watchers/xDaiBridgeWatcher'
import PolygonBridgeWatcher from 'src/watchers/PolygonBridgeWatcher'
import StakeWatcher from 'src/watchers/StakeWatcher'
import LoadTest from 'src/loadTest'
import HealthCheck from 'src/health/HealthCheck'
import Token from 'src/watchers/classes/Token'
import DbLogger from 'src/watchers/DbLogger'
import { Chain } from 'src/constants'
import arbbots from 'src/arb-bot/bots'
import {
  config as globalConfig,
  db as dbConfig,
  setConfigByNetwork,
  setBonderPrivateKey,
  setNetworkRpcUrls,
  setNetworkWaitConfirmations,
  setSyncConfig,
  slackAuthToken,
  slackChannel,
  slackUsername
} from 'src/config'

program
  .description('Start Hop node')
  .option(
    '-c, --config <string>',
    'Config file to use. Can be in JSON or YAML format'
  )
  .option('--env <string>', 'Environment variables file')
  .option(
    '-d, --dry',
    'Start in dry mode. If enabled, no transactions will be sent.'
  )
  .option(
    '--password-file <string>',
    'File containing password to unlock keystore'
  )
  .option('--clear-db', 'Clear cache database on start')
  .option('--log-db-state', 'Log db state periodically')
  .action(async (source: any) => {
    try {
      printHopArt()

      const configFilePath = source.config || source.args[0]
      const config: Config = await parseConfigFile(configFilePath)
      await setGlobalConfigFromConfigFile(config, source.passwordFile)
      if (source.clearDb) {
        await clearDb()
        logger.debug(`cleared db at: ${dbConfig.path}`)
      }

      const tokens = []
      if (config?.tokens) {
        for (let k in config.tokens) {
          const v = config.tokens[k]
          if (v) {
            tokens.push(k)
          }
        }
      }

      const enabledNetworks: { [key: string]: boolean } = Object.assign(
        {},
        defaultEnabledNetworks
      )
      if (config?.chains) {
        for (let k in config.chains) {
          enabledNetworks[k] = !!config.chains[k]
          const v = config.chains[k]
          if (v instanceof Object) {
            let _rpcUrls: string[] = []
            const { rpcUrl, rpcUrls, waitConfirmations } = v
            if (rpcUrl) {
              _rpcUrls.push(rpcUrl)
            } else if (rpcUrls.length) {
              _rpcUrls.push(...rpcUrls)
            }
            if (_rpcUrls.length) {
              setNetworkRpcUrls(k, _rpcUrls)
            }
            if (typeof waitConfirmations === 'number') {
              setNetworkWaitConfirmations(k, waitConfirmations)
            }
          }
        }
      }

      const bonder = config?.roles?.bonder
      const challenger = config?.roles?.challenger
      const order = Number(config?.order || 0)
      if (order) {
        logger.info('order:', order)
      }
      let maxStakeAmounts: any
      if (config?.stake) {
        maxStakeAmounts = config.stake
      }
      let commitTransfersMinThresholdAmounts: any = {}
      if (config?.commitTransfers) {
        if (config?.commitTransfers?.minThresholdAmount) {
          commitTransfersMinThresholdAmounts =
            config?.commitTransfers?.minThresholdAmount
        }
      }
      let bondWithdrawalAmounts: any = {}
      if (config?.bondWithdrawals) {
        bondWithdrawalAmounts = config.bondWithdrawals
      }
      let settleBondedWithdrawalsThresholdPercent: any = {}
      if (config?.settleBondedWithdrawals) {
        if (config?.settleBondedWithdrawals?.thresholdPercent) {
          settleBondedWithdrawalsThresholdPercent =
            config?.settleBondedWithdrawals?.thresholdPercent
        }
      }
      const slackEnabled = slackAuthToken && slackChannel && slackUsername
      if (slackEnabled) {
        logger.debug(`slack notifications enabled. channel #${slackChannel}`)
      }
      for (let k in globalConfig.networks) {
        const { waitConfirmations, rpcUrls } = globalConfig.networks[k]
        logger.info(`${k} wait confirmations: ${waitConfirmations || 0}`)
        logger.info(`${k} rpc: ${rpcUrls?.join(',')}`)
      }
      const dryMode = !!source.dry
      if (dryMode) {
        logger.warn(`dry mode enabled`)
      }
      const enabledWatchers: { [key: string]: boolean } = Object.assign(
        {},
        defaultEnabledWatchers
      )
      if (config?.watchers) {
        for (let key in config.watchers) {
          enabledWatchers[key] = (config.watchers as any)[key]
        }
      }
      startWatchers({
        enabledWatchers: Object.keys(enabledWatchers).filter(
          key => enabledWatchers[key]
        ),
        order,
        tokens,
        networks: Object.keys(enabledNetworks).filter(
          key => enabledNetworks[key]
        ),
        bonder,
        challenger,
        maxStakeAmounts,
        commitTransfersMinThresholdAmounts,
        bondWithdrawalAmounts,
        settleBondedWithdrawalsThresholdPercent,
        dryMode
      })
      if (config?.roles?.arbBot) {
        const maxTradeAmount = 0
        const minThreshold = 0
        arbbots.start({
          maxTradeAmount,
          minThreshold
        })
      }
      if (config?.roles?.xdaiBridge) {
        for (let token of tokens) {
          new xDaiBridgeWatcher({
            chainSlug: Chain.xDai,
            token
          }).start()
        }
      }
      if (source.logDbState) {
        new DbLogger().start()
      }
    } catch (err) {
      logger.error(`hop-node error: ${err.message}`)
      console.trace()
      process.exit(1)
    }
  })