import * as ethutil from '../utils/ethutil'
import LuxABI from 'contracts/build/contracts/Lux.sol/Lux.json'
import * as actions from '../actions';
import { loadTranslations } from '../utils/translations'

let language = localStorage.getItem('lang')
let strings = loadTranslations(language)

const loadLuxContract = store => next => action => {
  if (action.type !== actions.LOAD_LUX_CONTRACT) return next(action)
  if (action.contract !== undefined) return next(action)

  const state = store.getState()
  if (
    !state.network.web3 ||
    !state.player.address ||
    !state.gamedata.luxAddress
  ) {
    // console.log(`UNABLE TO LOAD LUX`)
    return next(action)
  }
  // console.log(`GETTING LUX...`, state.gamedata.luxAddress)

  // Get contract template
  const Lux = ethutil.getTruffleContract(
    LuxABI,
    {
      from: state.player.address,
      gasPrice: state.network.gasPrice
    }
  )

  // Get deployed instance
  Lux.at(state.gamedata.luxAddress)
    .then(instance => {

      console.info(`=> ${strings.luxAddressMessage}\n${instance.address}`)

      // for player interaction via the browser's console
      window.lux = instance

      action.contract = instance
      
      next(action)

      // Get game data
      store.dispatch(actions.syncPlayerProgress())

      // Auto-restore previoius instance
      if (state.gamedata.activeLevel)
        store.dispatch(actions.loadLevelInstance(state.gamedata.activeLevel, true, false))

    })
    .catch((err) => {
      console.log({ err })
      console.error(`@bad ${strings.luxNotFoundMessage}`)
    })
}

export default loadLuxContract