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

function query({ key, name = "query", op, pollInterval }) {
  return Comp => {
    @timer
    @connect(
      ({ query }, ownProps) => {
        const queryKey = getKey(key, ownProps)

        return {
          _queryKey_: queryKey,
          _loading_: query && query[queryKey] ? query[queryKey].loading : false,
          _error_: query && query[queryKey] && query[queryKey].error,
          _data_: query && query[queryKey] && query[queryKey].data,
        }
      },
      {
        _setLoading_: act.setLoading,
        _setError_: act.setError,
        _setData_: act.setData,
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
          ...attrs
        } = this.props
        /* eslint-enable no-unused-vars */

        return <Comp {...attrs} {...props} />
      }

      componentDidMount() {
        this.fetch()
      }

      componentWillReceiveProps(nextProps) {
        if (
          this.props._loading_ !== nextProps._loading_ ||
          this.props._error_ !== nextProps._error_ ||
          this.props._data_ !== nextProps._data_
        ) {
          this.propsObj = {}
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
        }
      }

      refetch = async () => {
        const {
          _queryKey_,
          _setLoading_,
          _setError_,
          _setData_,
          _loading_,
          setTimeout,
          clearTimeout,
        } = this.props

        if (!_loading_ && !this.isFetching) {
          _setError_(_queryKey_, undefined)
          _setLoading_(_queryKey_, true)
          try {
            this.isFetching = true
            this.loadTimer = setTimeout(query.openLoading, query.loadingWait * 1000)
            const data = await op(this.props)
            clearTimeout(this.loadTimer)
            _setData_(_queryKey_, data)
          } catch (e) {
            clearTimeout(this.loadTimer)
            query.onError(e)
            _setError_(_queryKey_, e)
          } finally {
            this.isFetching = false
            query.closeLoading()
            _setLoading_(_queryKey_, false)
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
