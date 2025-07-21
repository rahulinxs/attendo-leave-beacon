import { serve } from 'std/server'
import { load } from 'cheerio'
import { fetch } from 'undici'

serve(async (req) => {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing LinkedIn URL' }), { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const html = await res.text()
    const $ = load(html)

    // Extract fields (selectors may need adjustment)
    const name = $('h1').first().text().trim()
    const description = $('meta[name="description"]').attr('content') || ''
    const website = $('a[href^="http"]').first().attr('href') || ''
    const industry = $('dd:contains("Industry")').next().text().trim() || ''
    const size = $('dd:contains("Company size")').next().text().trim() || ''
    const headquarters = $('dd:contains("Headquarters")').next().text().trim() || ''
    const type = $('dd:contains("Type")').next().text().trim() || ''
    const founded = $('dd:contains("Founded")').next().text().trim() || ''
    const locations = $('dd:contains("Locations")').next().text().trim() || ''

    return new Response(JSON.stringify({
      name,
      description,
      website,
      industry,
      size,
      headquarters,
      type,
      founded,
      locations
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch LinkedIn data', details: String(err) }), { status: 500 })
  }
})
