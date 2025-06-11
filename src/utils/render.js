const views = require.context('../pages/', true, /index\.js$/)

export async function render(viewPath, props = {}) {
  const app = document.getElementById('root')
  if (!app) throw new Error('Element with id="root" not found')

  const filePath = viewPath.replace(/\./g, '/')
  const modulePath = `./${filePath}/index.js`

  if (!views.keys().includes(modulePath)) {
    console.error(`View not found in bundle: ${modulePath}`)
    app.innerHTML = `<h1>404</h1><p>Page "${viewPath}" not found</p>`
    return
  }

  try {
    const module = await views(modulePath)
    if (typeof module.default === 'function') {
      const html = await module.default(props)
      app.innerHTML = html
      if (typeof module.setup === 'function') {
        module.setup()
      }
    } else {
      console.warn(`Module ${modulePath} does not export a default render function`)
    }
  } catch (err) {
    console.error(`Failed to load view: ${modulePath}`, err)
    app.innerHTML = `<h1>Error</h1><p>Cannot load view: ${viewPath}</p>`
  }
}
