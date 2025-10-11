import * as db from './db.js'

// Insert a conference
export async function insertConference(conference) {
  const query = `
    INSERT INTO conferences (
      organization, event_name, date_start, date_end,
      location, state, city, venue, website, status, category
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT DO NOTHING
    RETURNING id
  `

  const values = [
    conference.organization || conference.association, // Handle both field names
    conference.event,
    conference.dateStart,
    conference.dateEnd || null,
    conference.location || null,
    conference.state || null,
    conference.city || null,
    conference.venue || null,
    conference.website || null,
    conference.status || 'confirmed',
    conference.category || null
  ]

  try {
    const result = await db.query(query, values)
    return result.rows[0]?.id
  } catch (error) {
    console.error('Error inserting conference:', error.message)
    throw error
  }
}

// Get all conferences
export async function getAllConferences() {
  const query = `
    SELECT
      id, organization, event_name as event, date_start as "dateStart",
      date_end as "dateEnd", location, state, city, venue,
      website, status, category
    FROM conferences
    ORDER BY date_start ASC
  `

  const result = await db.query(query)
  return result.rows
}

// Get conferences by state
export async function getConferencesByState(stateCode) {
  const query = `
    SELECT
      id, organization, event_name as event, date_start as "dateStart",
      date_end as "dateEnd", location, state, city, venue,
      website, status, category
    FROM conferences
    WHERE UPPER(state) = UPPER($1)
    ORDER BY date_start ASC
  `

  const result = await db.query(query, [stateCode])
  return result.rows
}

// Get national conferences
export async function getNationalConferences() {
  const query = `
    SELECT
      id, organization, event_name as event, date_start as "dateStart",
      date_end as "dateEnd", location, state, city, venue,
      website, status, category
    FROM conferences
    WHERE category = 'National Association' OR state IS NULL
    ORDER BY date_start ASC
  `

  const result = await db.query(query)
  return result.rows
}

// Get upcoming conferences
export async function getUpcomingConferences(limit = 10) {
  const query = `
    SELECT
      id, organization, event_name as event, date_start as "dateStart",
      date_end as "dateEnd", location, state, city, venue,
      website, status, category
    FROM conferences
    WHERE date_start >= CURRENT_DATE AND status = 'confirmed'
    ORDER BY date_start ASC
    LIMIT $1
  `

  const result = await db.query(query, [limit])
  return result.rows
}

export default {
  insertConference,
  getAllConferences,
  getConferencesByState,
  getNationalConferences,
  getUpcomingConferences
}
