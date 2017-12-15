import update from "immutability-helper"
import { SET_LOADING, SET_ERROR, SET_DATA, INC_USAGE } from "./actions"
import { LRUCache } from "lru-fast"
import { groups as groupSizes, DEFAULT_GROUP_SIZE } from "./index"

const groups = {}

const initialState = {}

const handlers = {
  [SET_LOADING](state, { group, key, val }) {
    return update(readyGroupKey(state, group, key), {
      [group]: {
        [key]: {
          loading: { $set: val },
        },
      },
    })
  },

  [SET_ERROR](state, { group, key, val }) {
    return update(readyGroupKey(state, group, key), {
      [group]: {
        [key]: {
          error: { $set: val },
        },
      },
    })
  },

  [SET_DATA](state, { group, key, val }) {
    const newState = update(readyGroupKey(state, group, key), {
      [group]: {
        [key]: {
          data: { $set: val },
        },
      },
    })

    return purgedState(newState, group, key)
  },

  [INC_USAGE](state, { group, key }) {
    return purgedState(readyGroupKey(state, group, key), group, key)
  },
}

function readyGroupKey(state, group, key) {
  let newState = state

  if (newState[group] == null) {
    newState = update(newState, {
      [group]: { $set: {} },
    })

    groups[group] = new LRUCache(
      groupSizes[group] != null ? groupSizes[group] : DEFAULT_GROUP_SIZE,
    )
  }

  if (newState[group][key] == null) {
    newState = update(newState, {
      [group]: {
        [key]: { $set: {} },
      },
    })

    groups[group].set(key, true)
  }

  return newState
}

function purgedState(state, group, key) {
  groups[group].set(key, true)

  const keys = new Set(groups[group].keys())
  let newState = state

  for (let k of Object.keys(newState[group])) {
    if (!keys.has(k)) {
      newState = update(newState, {
        [group]: {
          [k]: { $set: null },
        },
      })
    }
  }

  return newState
}

export default function app(state = initialState, action) {
  const type = action.type
  if (!handlers[type]) return state
  return handlers[type](state, action)
}
