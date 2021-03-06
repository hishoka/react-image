import React, {Component} from 'react'
import {node, func, oneOfType, string, arrayOf, bool} from 'prop-types'

const cache = {}
class Img extends Component {
  static propTypes = {
    loader: node,
    unloader: node,
    decode: bool,
    src: oneOfType([string, arrayOf(string)]),
    container: func
  }

  static defaultProps = {
    loader: false,
    unloader: false,
    decode: true,
    src: [],
    // by default, just return what gets sent in. Can be used for advanced rendering
    // such as animations
    container: x => x
  }

  constructor(props) {
    super(props)

    this.sourceList = this.srcToArray(this.props.src)

    // check cache to decide at which index to start
    for (let i = 0; i < this.sourceList.length; i++) {
      // if we've never seen this image before, the cache wont help.
      // no need to look further, just start loading
      /* istanbul ignore else */
      if (!(this.sourceList[i] in cache)) break

      // if we have loaded this image before, just load it again
      /* istanbul ignore else */
      if (cache[this.sourceList[i]] === true) {
        this.state = {currentIndex: i, isLoading: false, isLoaded: true}
        return true
      }
    }

    this.state = this.sourceList.length
      ? // 'normal' opperation: start at 0 and try to load
        {currentIndex: 0, isLoading: true, isLoaded: false}
      : // if we dont have any sources, jump directly to unloaded
        {isLoading: false, isLoaded: false}
  }

  srcToArray = src => (Array.isArray(src) ? src : [src]).filter(x => x)

  onLoad = () => {
    cache[this.sourceList[this.state.currentIndex]] = true
    /* istanbul ignore else */
    if (this.i) this.setState({isLoaded: true})
  }

  onError = () => {
    cache[this.sourceList[this.state.currentIndex]] = false
    // if the current image has already been destroyed, we are probably no longer mounted
    // no need to do anything then
    /* istanbul ignore else */
    if (!this.i) return false

    // before loading the next image, check to see if it was ever loaded in the past
    for (
      var nextIndex = this.state.currentIndex + 1;
      nextIndex < this.sourceList.length;
      nextIndex++
    ) {
      // get next img
      let src = this.sourceList[nextIndex]

      // if we have never seen it, its the one we want to try next
      if (!(src in cache)) {
        this.setState({currentIndex: nextIndex})
        break
      }

      // if we know it exists, use it!
      if (cache[src] === true) {
        this.setState({
          currentIndex: nextIndex,
          isLoading: false,
          isLoaded: true
        })
        return true
      }

      // if we know it doesn't exist, skip it!
      /* istanbul ignore else */
      if (cache[src] === false) continue
    }

    // currentIndex is zero bases, length is 1 based.
    // if we have no more sources to try, return - we are done
    if (nextIndex === this.sourceList.length)
      return this.setState({isLoading: false})

    // otherwise, try the next img
    this.loadImg()
  }

  loadImg = () => {
    this.i = new Image()
    this.i.src = this.sourceList[this.state.currentIndex]

    if (this.props.decode && this.i.decode) {
      this.i
        .decode()
        .then(this.onLoad)
        .catch(this.onError)
    } else {
      this.i.onload = this.onLoad
    }

    this.i.onerror = this.onError
  }

  unloadImg = () => {
    delete this.i.onerror
    delete this.i.onload
    try {
      delete this.i.src
    } catch (e) {
      // On Safari in Strict mode this will throw an exception,
      //  - https://github.com/mbrevda/react-image/issues/187
      // We don't need to do anything about it.
    }
    delete this.i
  }

  componentDidMount() {
    // kick off process
    /* istanbul ignore else */
    if (this.state.isLoading) this.loadImg()
  }

  componentWillUnmount() {
    // ensure that we dont leave any lingering listeners
    /* istanbul ignore else */
    if (this.i) this.unloadImg()
  }

  componentWillReceiveProps(nextProps) {
    let src = this.srcToArray(nextProps.src)

    let srcAdded = src.filter(s => this.sourceList.indexOf(s) === -1)
    let srcRemoved = this.sourceList.filter(s => src.indexOf(s) === -1)

    // if src prop changed, restart the loading process
    if (srcAdded.length || srcRemoved.length) {
      this.sourceList = src

      // if we dont have any sources, jump directly to unloader
      if (!src.length) return this.setState({isLoading: false, isLoaded: false})
      this.setState(
        {currentIndex: 0, isLoading: true, isLoaded: false},
        this.loadImg
      )
    }
  }

  render() {
    // if we have loaded, show img
    if (this.state.isLoaded) {
      // clear non img props
      let {src, loader, unloader, decode, container, ...rest} = this.props //eslint-disable-line
      let imgProps = {
        ...{src: this.sourceList[this.state.currentIndex]},
        ...rest
      }
      return this.props.container(<img {...imgProps} />)
    }

    // if we are still trying to load, show img and a loader if requested
    if (!this.state.isLoaded && this.state.isLoading)
      return this.props.loader ? this.props.container(this.props.loader) : null

    // if we have given up on loading, show a place holder if requested, or nothing
    /* istanbul ignore else */
    if (!this.state.isLoaded && !this.state.isLoading)
      return this.props.unloader
        ? this.props.container(this.props.unloader)
        : null
  }
}

export default Img
