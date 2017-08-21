export const SET_LOADING = "REACT_HOC_QUERY_SET_LOADING"
export const SET_ERROR = "REACT_HOC_QUERY_SET_ERROR"
export const SET_DATA = "REACT_HOC_QUERY_SET_DATA"

export function setLoading(key, val) {
  return {
    type: SET_LOADING,
    key,
    val,
  }
}

export function setError(key, val) {
  return {
    type: SET_ERROR,
    key,
    val,
  }
}

export function setData(key, val) {
  return {
    type: SET_DATA,
    key,
    val,
  }
}
