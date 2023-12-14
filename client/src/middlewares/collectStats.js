import * as actions from '../actions';

let queuedAction;

const collectStats = store => next => action => {
  if(action.type !== actions.COLLECT_STATS) {
    if(queuedAction && action.type === actions.LOAD_LUX_CONTRACT && action.contract) {
      // console.log(`RETRIGGER`)
      next(action)
      store.dispatch(queuedAction)
      queuedAction = null
      return
    }
    return next(action)
  }

  const state = store.getState()
  // console.log(`TRY COLLECT_STATS >`, state.contracts.lux !== undefined)
  if(
    !state.network.web3 ||
    !state.contracts.lux
  ) {
    if(!queuedAction) queuedAction = action
    return
  }

  const query = {
    filter: {},
    range: {
      fromBlock: 0,
      toBlock: state.network.blockNum || 'latest'
    }
  }
  // console.log(`query`, query)

  // Get Level created
  if(!action.createdInstanceLogs) {
    state.contracts.lux.LevelInstanceCreatedLog(query.filter, query.range).then(
      (error, result)=> {
        if(error) return console.log(error)
        action.createdInstanceLogs = result
        store.dispatch(action)
      }
    )
  }

  // Level completed
  if(!action.completedLevelLogs) {
    state.contracts.lux.LevelCompletedLog(query.filter, query.range).then(
      (error, result)=> {
        if(error) return console.log(error)
        action.completedLevelLogs = result
        store.dispatch(action)
      }
    )
  }

  next(action)
}

export default collectStats