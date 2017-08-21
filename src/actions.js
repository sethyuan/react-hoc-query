export const SET_LOADING = "REACT_HOC_QUERY_SET_LOADING"
export const SET_ERROR = "REACT_HOC_QUERY_SET_ERROR"
export const SET_DATA = "REACT_HOC_QUERY_SET_DATA"
export const INC_USAGE = "REACT_HOC_QUERY_INC_USAGE"

export function setLoading(group, key, val) {
  return {
    type: SET_LOADING,
    group,
    key,
    val,
  }
}

export function setError(group, key, val) {
  return {
    type: SET_ERROR,
    group,
    key,
    val,
  }
}

export function setData(group, key, val) {
  return {
    type: SET_DATA,
    group,
    key,
    val,
  }
}

export function incUsage(group, key) {
  return {
    type: INC_USAGE,
    group,
    key,
  }
}
