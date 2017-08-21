import update from "immutability-helper"
import {
  SET_LOADING,
  SET_ERROR,
  SET_DATA,
} from "./actions"

function readyKey(state, key) {
  let newState = state

  if (newState[key] == null) {
    newState = update(newState, {
      [key]: { $set: {} },
    })
  }

  return newState
}

const initialState = {}

const handlers = {
  [SET_LOADING](state, { key, val }) {
    return update(readyKey(state, key), {
      [key]: {
        loading: { $set: val },
      },
    })
  },

  [SET_ERROR](state, { key, val }) {
    return update(readyKey(state, key), {
      [key]: {
        error: { $set: val },
      },
    })
  },

  [SET_DATA](state, { key, val }) {
    return update(readyKey(state, key), {
      [key]: {
        data: { $set: val },
      },
    })
  },
}

export default function app(state = initialState, action) {
  const type = action.type
  if (!handlers[type]) return state
  return handlers[type](state, action)
}
