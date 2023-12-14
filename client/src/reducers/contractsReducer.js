import * as actions from '../actions';

const initialState = {
  lux: undefined,
  levels: {},
  nonce: 0
}

const contractsReducer = function(state = initialState, action) {
  switch(action.type) {

    case actions.LOAD_LUX_CONTRACT:
      return {
        ...state,
        lux: action.contract
      };

    case actions.LOAD_LEVEL_INSTANCE:
      return {
        ...state,
        levels: {
          ...state,
          [action.level.deployedAddress]: action.instance
        },
        nonce: state.nonce + 1
      }

    case actions.SUBMIT_LEVEL_INSTANCE:
      if(action.completed) {
        return {
          ...state,
          levels: {
            ...state,
            [action.level.deployedAddress]: undefined
          },
          nonce: state.nonce + 1
        }
      }
      else return state

    default:
      return state
  }
}

export default contractsReducer