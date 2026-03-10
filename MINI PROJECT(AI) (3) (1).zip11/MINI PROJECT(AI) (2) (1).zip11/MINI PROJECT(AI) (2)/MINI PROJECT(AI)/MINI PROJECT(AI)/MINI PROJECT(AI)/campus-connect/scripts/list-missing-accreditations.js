const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'data', 'colleges.json')
try {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const missing = data.filter(c => !c.nba || !c.naac).map(c => ({
    name: c.name,
    website: c.website || null,
    nba: c.nba || null,
    naac: c.naac || null
  }))
  if (missing.length === 0) {
    console.log('NO_MISSING')
  } else {
    missing.forEach(m => console.log(JSON.stringify(m)))
  }
} catch (err) {
  console.error('ERROR', err.message)
  process.exit(1)
}
