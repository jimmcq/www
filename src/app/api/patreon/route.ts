const PATREON_API = 'https://www.patreon.com/api/oauth2/v2/campaigns'
const PATREON_URL = 'https://www.patreon.com/c/SpaceMolt'

interface PatreonTier {
  title: string
  amount_cents: number
  description: string
  patron_count: number
}

interface PatreonGoal {
  title: string
  amount_cents: number
  completed_percentage: number
}

interface PatreonMember {
  name: string
  tier: string | null
}

interface PatreonResponse {
  patron_count: number
  pledge_url: string
  tiers: PatreonTier[]
  goals: PatreonGoal[]
  members: PatreonMember[]
}

const FALLBACK: PatreonResponse = {
  patron_count: 0,
  pledge_url: PATREON_URL,
  tiers: [],
  goals: [],
  members: [],
}

export async function GET() {
  const token = process.env.PATREON_CREATOR_TOKEN
  if (!token) {
    return Response.json(FALLBACK, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }

  try {
    // Fetch campaign data (tiers, goals, patron count)
    const campaignFields = [
      'fields[campaign]=patron_count,pledge_url,creation_name',
      'include=tiers,goals',
      'fields[tier]=title,amount_cents,description,patron_count',
      'fields[goal]=title,amount_cents,completed_percentage',
    ].join('&')

    const campaignRes = await fetch(`${PATREON_API}?${campaignFields}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    })

    if (!campaignRes.ok) {
      console.error(`Patreon campaigns API error: ${campaignRes.status} ${campaignRes.statusText}`)
      return Response.json(FALLBACK, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      })
    }

    const campaignJson = await campaignRes.json()
    const campaign = campaignJson.data?.[0]
    const campaignId = campaign?.id
    const included = campaignJson.included ?? []

    const tiers: PatreonTier[] = included
      .filter((item: { type: string }) => item.type === 'tier')
      .map((item: { attributes: PatreonTier }) => ({
        title: item.attributes.title,
        amount_cents: item.attributes.amount_cents,
        description: item.attributes.description,
        patron_count: item.attributes.patron_count,
      }))
      .filter((t: PatreonTier) => t.amount_cents > 0)
      .sort((a: PatreonTier, b: PatreonTier) => a.amount_cents - b.amount_cents)

    const goals: PatreonGoal[] = included
      .filter((item: { type: string }) => item.type === 'goal')
      .map((item: { attributes: PatreonGoal }) => ({
        title: item.attributes.title,
        amount_cents: item.attributes.amount_cents,
        completed_percentage: item.attributes.completed_percentage,
      }))
      .sort((a: PatreonGoal, b: PatreonGoal) => a.amount_cents - b.amount_cents)

    // Build a tier ID -> title map for member lookups
    const tierIdMap = new Map<string, string>()
    for (const item of included) {
      if (item.type === 'tier' && item.attributes?.amount_cents > 0) {
        tierIdMap.set(item.id, item.attributes.title)
      }
    }

    // Fetch members (active patrons)
    const members: PatreonMember[] = []
    if (campaignId) {
      const membersFields = [
        `fields[member]=full_name,patron_status`,
        'include=currently_entitled_tiers',
        'fields[tier]=title',
        'page[count]=100',
      ].join('&')

      const membersRes = await fetch(
        `${PATREON_API}/${campaignId}/members?${membersFields}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 3600 },
        },
      )

      if (membersRes.ok) {
        const membersJson = await membersRes.json()
        const memberIncluded = membersJson.included ?? []

        // Build tier ID -> title map from members response
        const memberTierMap = new Map<string, string>()
        for (const item of memberIncluded) {
          if (item.type === 'tier') {
            memberTierMap.set(item.id, item.attributes?.title ?? '')
          }
        }

        for (const member of membersJson.data ?? []) {
          if (member.attributes?.patron_status !== 'active_patron') continue
          const name = member.attributes?.full_name ?? 'Anonymous'
          const tierRel = member.relationships?.currently_entitled_tiers?.data?.[0]
          const tierName = tierRel ? (memberTierMap.get(tierRel.id) ?? null) : null
          members.push({ name, tier: tierName })
        }
      }
    }

    const data: PatreonResponse = {
      patron_count: campaign?.attributes?.patron_count ?? 0,
      pledge_url: campaign?.attributes?.pledge_url ?? PATREON_URL,
      tiers,
      goals,
      members,
    }

    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('Patreon API fetch failed:', err)
    return Response.json(FALLBACK, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  }
}
