import React from "react"
import { connect } from "react-redux"
import * as act from "./actions"
import timer from "react-hoc-timerfuncs"

const getKey = (key, props) => {
  if (typeof key === "string") {
    return key
  } else if (typeof key === "function") {
    return key(props)
  }
}

function displayName(Comp) {
  return Comp.displayName || Comp.name || "Component"
}

function query({
  group = "DEFAULT",
  key,
  name = "query",
  op,
  pollInterval,
  dependOn,
  shouldFetch = () => true,
  immediate = !dependOn || dependOn.length === 0,
}) {
  return Comp => {
    @timer
    @connect(
      ({ query }, ownProps) => {
        const queryKey = getKey(key, ownProps)

        const props = {
          _queryKey_: queryKey,
          _loading_:
            query[group] && query[group][queryKey]
              ? query[group][queryKey].loading
              : false,
          _error_:
            query[group] &&
            query[group][queryKey] &&
            query[group][queryKey].error,
          _data_:
            query[group] &&
            query[group][queryKey] &&
            query[group][queryKey].data,
        }

        if (dependOn) {
          for (let dep of dependOn) {
            // dep is either a string or a { key, group }
            if (typeof dep === "string") {
              props[`_dep_${dep}_`] =
                query[group] && query[group][dep] && query[group][dep].data
            } else {
              props[`_dep_${dep.group}_${dep.key}_`] =
                query[dep.group] &&
                query[dep.group][dep.key] &&
                query[dep.group][dep.key].data
            }
          }
        }

        return props
      },
      {
        _setLoading_: act.setLoading,
        _setError_: act.setError,
        _setData_: act.setData,
        _incUsage_: act.incUsage,
      },
    )
    class Query extends React.Component {
      static displayName = `Query(${displayName(Comp)})`

      propsObj = {}

      render() {
        const propsObj = this.propsObj
        propsObj.loading = this.props._loading_
        propsObj.error = this.props._error_
        propsObj.data = this.props._data_
        propsObj.fetch = this.fetch
        propsObj.refetch = this.refetch
        propsObj.startPolling = this.startPolling
        propsObj.endPolling = this.endPolling

        const props = {
          [name]: propsObj,
        }

        /* eslint-disable no-unused-vars */
        const {
          _queryKey_,
          _loading_,
          _error_,
          _data_,
          _setLoading_,
          _setError_,
          _setData_,
          _incUsage_,
          ...attrs
        } = this.props
        /* eslint-enable no-unused-vars */

        if (dependOn) {
          for (let dep of dependOn) {
            if (typeof dep === "string") {
              delete attrs[`_dep_${dep}_`]
            } else {
              delete attrs[`_dep_${dep.group}_${dep.key}_`]
            }
          }
        }

        return <Comp {...attrs} {...props} />
      }

      componentDidMount() {
        const depsSatisfied =
          dependOn &&
          dependOn.every(dep => {
            if (typeof dep === "string") {
              return this.props[`_dep_${dep}_`] != null
            } else {
              return this.props[`_dep_${dep.group}_${dep.key}_`] != null
            }
          })

        if (immediate || depsSatisfied) {
          this.fetch()
        }
      }

      componentWillReceiveProps(nextProps) {
        if (
          this.props._loading_ !== nextProps._loading_ ||
          this.props._error_ !== nextProps._error_ ||
          this.props._data_ !== nextProps._data_
        ) {
          this.propsObj = {}
        }

        if (dependOn && dependOn.length > 0) {
          const depProps = dependOn.map(dep => {
            // dep is either a string or a { key, group }
            if (typeof dep === "string") {
              return `_dep_${dep}_`
            } else {
              return `_dep_${dep.group}_${dep.key}_`
            }
          })

          const someChanged = depProps.some(
            dep => this.props[dep] !== nextProps[dep],
          )

          const allNonNull = depProps.every(dep => nextProps[dep] != null)

          if (someChanged && allNonNull && shouldFetch(nextProps)) {
            this.refetch(nextProps)
          }
        }
      }

      componentDidUpdate(prevProps, prevState) {
        if (this.props._queryKey_ !== getKey(key, prevProps)) {
          this.fetch()
        }
      }

      fetch = async () => {
        if (this.props._data_ == null) {
          await this.refetch()
        } else {
          this.props._incUsage_(group, this.props._queryKey_)
        }
      }

      refetch = async (props = this.props) => {
        const {
          _queryKey_,
          _setLoading_,
          _setError_,
          _setData_,
          _incUsage_,
          _loading_,
          setTimeout,
          clearTimeout,
        } = props

        if (!_loading_ && !this.isFetching) {
          _setError_(group, _queryKey_, undefined)
          _setLoading_(group, _queryKey_, true)
          try {
            this.isFetching = true
            this.loadTimer = setTimeout(
              query.openLoading,
              query.loadingWait * 1000,
            )
            const data = await op(props)
            clearTimeout(this.loadTimer)
            _setData_(group, _queryKey_, data)
            _incUsage_(group, _queryKey_)
          } catch (e) {
            clearTimeout(this.loadTimer)
            query.onError(e)
            _setError_(group, _queryKey_, e)
          } finally {
            this.isFetching = false
            query.closeLoading()
            _setLoading_(group, _queryKey_, false)
          }
        }
      }

      startPolling = () => {
        const { setInterval } = this.props
        this.pollTimer = setInterval(this.refetch, pollInterval * 1000)
      }

      endPolling = () => {
        const { clearInterval } = this.props
        clearInterval(this.pollTimer)
      }
    }
    return Query
  }
}

query.loadingWait = 0.1
query.openLoading = () => {}
query.closeLoading = () => {}
query.onError = () => {}

export default query

export const groups = {
  DEFAULT: 99999,
}

export const DEFAULT_GROUP_SIZE = 10
