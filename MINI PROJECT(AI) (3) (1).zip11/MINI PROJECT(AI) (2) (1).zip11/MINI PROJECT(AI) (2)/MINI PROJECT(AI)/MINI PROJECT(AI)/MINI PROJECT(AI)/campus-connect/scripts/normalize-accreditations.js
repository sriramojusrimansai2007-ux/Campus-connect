const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'data', 'colleges.json')
function cleanText(s){
  if(!s) return null
  if(typeof s !== 'string') return null
  // remove HTML tags and attributes
  let t = s.replace(/<[^>]*>/g,'')
  t = t.replace(/\s+/g,' ')
  t = t.replace(/"|\'|=|class=|data-[^=]*=[^\s]*/gi,'')
  t = t.trim()
  if(t.length === 0) return null
  return t
}

function normalize() {
  const raw = fs.readFileSync(file,'utf8')
  const list = JSON.parse(raw)
  for(const c of list){
    // NAAC normalization
    if(c.naac){
      const cleaned = cleanText(c.naac)
      const m = cleaned && cleaned.match(/A\+\+|A\+|A|B\+|B|C/i)
      if(m){
        c.naac = 'NAAC ' + m[0].toUpperCase()
      } else {
        c.naac = cleaned || null
      }
    }
    // NBA normalization
    if(c.nba){
      const cleaned = cleanText(c.nba)
      if(!cleaned) { c.nba = null; continue }
      if(/nba/i.test(cleaned) || /accredit(ed|ation)/i.test(cleaned)){
        // try to extract short phrase containing NBA
        const m = cleaned.match(/(NBA[^,;:\n\r]{0,200})/i)
        if(m){
          c.nba = m[1].trim()
        } else {
          c.nba = cleaned.substring(0,200)
        }
      } else {
        // doesn't look like NBA info
        c.nba = null
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(list,null,2),'utf8')
  console.log('normalized')
}

normalize()
