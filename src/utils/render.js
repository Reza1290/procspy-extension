export async function render(viewPath, props = {}) {
  const app = document.getElementById('root')
  if (!app) {
    throw new Error('Element with id="root" not found')
  }

  const filePath = viewPath.replace(/\./g, '/')
  const modulePath = `/src/pages/${filePath}/index.js`

  try {
    const module = await import(modulePath)
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


