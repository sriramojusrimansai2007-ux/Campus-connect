const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'data', 'colleges.json')
async function run() {
  const raw = fs.readFileSync(file, 'utf8')
  const colleges = JSON.parse(raw)

  for (const c of colleges) {
    if (c.nba && c.naac) continue
    if (!c.website) continue
    try {
      const res = await fetch(c.website, {redirect: 'follow'})
      const text = await res.text()
      // simple regex searches
      const nbaMatch = text.match(/NBA[^\n<\r]{0,120}\b(A|A\+|A\+\+|B|B\+|Accredited|accredited|All|UG programs|programs)/i)
      const naacMatch = text.match(/NAAC[^\n<\r]{0,120}\b(A\+\+|A\+|A|B|B\+|C|accredited|grade|Grade)/i)
      if (nbaMatch && !c.nba) c.nba = nbaMatch[0].trim()
      if (naacMatch && !c.naac) c.naac = naacMatch[0].trim()
      console.log('PARSED', c.name, '=>', {nba: c.nba || null, naac: c.naac || null})
    } catch (err) {
      console.error('FETCH_ERROR', c.name, err.message)
    }
  }

  fs.writeFileSync(file, JSON.stringify(colleges, null, 2), 'utf8')
  console.log('DONE')
}

run().catch(e=>{console.error(e); process.exit(1)})
