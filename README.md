# react-hoc-query

HOC to help you query restful data. It provides the following convenient
features:

- You can query whatever you like, but the primary use case is to query
  restful API services
- Query results are stored in Redux' store
  - so the same query elsewhere will simply fetch from cache (the store) and,
  - any updates to the data in store will cause dependent components to
    refresh and,
  - you can use the redux devtool to debug data
- A manual `refetch` is provided via props in case you need to ignore possible
  cache
- Status changes of the query are provided via props (`loading`, `error`,
  `data`)
- You can optionally setup a global query error handler to centralize error
  processing (`query.onError(e)`). E.g, display a dialog for network errors.
- You can optionally setup `query.openLoading()`, `query.closeLoading()`
  and `query.loadingWait` to implement displaying a loading indicator UI
  should the query result delays for too long (longer than `query.loadingWait`)
- You can setup an interval to poll newest data periodically, and control when
  to start/end polling via props (`startPolling`, `endPolling`)
- Multiple queries and query dependencies are supported
- You can create groups to control the overall cache size. Each group has
  a limit on how much query results it can store, and will discard excessive
  items using the LRU algorithm.

## Installation

```bash
yarn add react-hoc-query
```

## Basic Usage

### Setup the reducer

```js
import query from "react-hoc-query/lib/reducers"

const store = createStore(
  combineReducers({
    // ...,
    // It has to be named `query`.
    query,
  }),
  // ...
)
```

### Simple usage

```js
import React from "react"
import query from "react-hoc-query"

@query({
  key: "loginInfo",
  op: async props => {
    // Call whatever API you need here and return the result.
    // Note that this is an async function.
    // Anything you return, will be available under the `data` prop.
    return await api.isLoggedIn()
  },
})
class App from React.Component {
  render() {
    const { loading, error, data } = this.props.query

    if (loading) return <YourLoadingView />

    if (!data || error) return <YourErrorView error={error} />

    if (data.isLoggedIn) {
      return <YourHomePage />
    } else {
      return <YourLoginPage />
    }
  }
}
```

With the above example, all components with a query key of **loginInfo**
will share the same data. If a cache is available in store, that cache will be
used.

### Use refetch to guarantee data freshness

```js
import React from "react"
import query from "react-hoc-query"
import mutate from "react-hoc-mutate"

@query({
  key: "loginInfo",
  op: api.isLoggedIn,
})
@mutate({
  name: "login",
  op: api.login,
})
class Login from React.Component {
  render() {
    return (
      <button onClick={this.login}>Login</button>
    )
  }

  login = async () => {
    try {
      await this.props.login()
      await this.props.query.refetch()
    } catch (e) {
      // handle it
    }
  }
}
```

With the above example, `loginInfo` is refreshed after successful login, and
every component that depends on `loginInfo` will get refreshed with the new
login data.

### Use a custom name for prop

```js
import React from "react"
import query from "react-hoc-query"

@query({
  key: "loginInfo",
  name: "loginInfo" // defaults to "query",
  op: api.isLoggedIn,
})
class App from React.Component {
  render() {
    const { loading, error, data } = this.props.loginInfo

    if (loading) return <YourLoadingView />

    if (!data || error) return <YourErrorView error={error} />

    if (data.isLoggedIn) {
      return <YourHomePage />
    } else {
      return <YourLoginPage />
    }
  }
}
```

### Polling interval

```js
import React from "react"
import query from "react-hoc-query"

@query({
  key: "serverTime",
  op: api.serverTime,
  pollInterval: 60, // 60sec
})
class App from React.Component {
  render() {
    const { data } = this.props.query

    if (data) return <YourView data={data} />
  }

  componentDidMount() {
    this.props.query.startPolling()
  }

  componentWillUnmount() {
    this.props.query.endPolling()
  }
}
```

### Query dependencies

In the below example, 3 queries are used by App, but only `loginInfo` and
`userProfile` are necessary for start displaying content to the users.
`loginInfo` and `chatChannels` will be fetched concurrently while
`userProfile` is only fetched after `loginInfo` is available and that the user
is logged in.

Each time one of the dependencies changes, the query gets refetched upon
dependency availability given `shouldFetch` returns true.

Also, note that the order in which you apply the queries is important,
queries with `dependOn` should appear below their dependencies.

```js
import React from "react"
import query from "react-hoc-query"
import { propReduce } from "reactutils"

@query({
  key: "loginInfo",
  name: "loginInfo",
  op: api.loginInfo,
})
@query({
  key: "chatChannels",
  name: "chatChannels",
  op: api.chatChannels,
})
@query({
  key: props =>
    props.loginInfo.data ? `userProfile:${props.loginInfo.data.uid}` : "",
  name: "userProfile",
  op: props => api.userProfile(props.loginInfo.data.userId),
  dependOn: ["loginInfo"],
  shouldFetch: props => props.loginInfo.data.isLoggedIn,
})
@propReduce(
  { loading: (ret, item) => ret || item.loading },
  ["loginInfo", "userProfile"],
  false,
)
export default class App extends React.Component {
  render() {
    const { loading, loginInfo, chatChannels, userProfile } = this.props

    if (loading) {
      return <div>Loading</div>
    } else if (userProfile.data) {
      return <div className="demo-app">Hello {userProfile.data.name}</div>
    } else {
      return null
    }
  }
}
```

### Global onError handler

on your app entry:

```js
import query from "react-hoc-query"

query.onError = err => {
  if (err.type === "your_error_type") {
    // dispatch action to open error dialog
  }
}
```

### Global loading indicator popup handler

on your app entry:

```js
import query from "react-hoc-query"

// If a query finishes before this times out then `openLoading`
// will not get called.
query.loadingWait = 0.1 // defaults to 0.1sec

query.openLoading = () => {
  // dispatch action to popup loading indicator
}

query.closeLoading = () => {
  // dispatch action to close loading indicator
}
```

### Use group to limit cache size

on your app entry:

```js
import { groups } from "react-hoc-query"

// This defines the cache size (number of query results) for the group
// `movieItems`. Default size for new groups is 10. Everything else goes
// into the `DEFAULT` group, which is practically unlimited.
groups.movieItems = 20
```

usage:

```js
import React from "react"
import query from "react-hoc-query"

@query({
  group: "movieItems",
  // Note key could be a function taking `props` too.
  key: props => `movie-item-${props.id}`
  op: async props => {
    return await api.movieItem(props.id)
  },
})
class MovieDetail from React.Component {
  render() {
    const { loading, error, data } = this.props.query
    // ...
  }
}
```

With the above setup, no matter how many movie items you visit, only the most
recent 20 will be cached. This prevents possible overuse of memory.

## Dev setup

1. `yarn`

### npm run tasks

- **yarn build**: Transpile source code
