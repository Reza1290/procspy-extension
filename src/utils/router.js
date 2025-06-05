import { render } from './render.js'

const routes = {
  home: (props = {}) => render('home', props),
  init: (props = {}) => render('init', props),
  requirement: (props = {}) => render('requirement', props),
  default_auth: (props = {}) => render('auth.token', props),
  proctoring: (props = {}) => render('proctoring', props),
  loading: (props={}) => render('loading', props)
}

export function navigateTo(path, props = {}) {
  history.replaceState({ props }, '', path)
  handleRouteChange()
}

function handleRouteChange() {
  const route = location.pathname.replace(/^\/|\/$/g, '') || 'init'
  const viewFn = routes[route]

  if (typeof viewFn === 'function') {
    const props = history.state?.props || {}
    viewFn(props)
  } else {
    
    console.warn(`Route not found: ${route}`)
  }
}

window.addEventListener('popstate', handleRouteChange)
window.addEventListener('DOMContentLoaded', handleRouteChange)
