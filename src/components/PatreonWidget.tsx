'use client'

import { useEffect, useState } from 'react'
import { Heart, ExternalLink, Target, Users } from 'lucide-react'
import styles from './PatreonWidget.module.css'

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

interface PatreonData {
  patron_count: number
  pledge_url: string
  tiers: PatreonTier[]
  goals: PatreonGoal[]
  members: PatreonMember[]
}

export function PatreonWidget() {
  const [data, setData] = useState<PatreonData | null>(null)

  useEffect(() => {
    fetch('/api/patreon')
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
  }, [])

  const patronCount = data?.patron_count ?? 0
  const pledgeUrl = data?.pledge_url ?? PATREON_URL
  const activeGoal = data?.goals?.find((g) => g.completed_percentage < 100)
  const tiers = data?.tiers ?? []
  const members = data?.members ?? []

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <Heart size={20} className={styles.heartIcon} />
        <span className={styles.headerLabel}>Patreon</span>
      </div>

      <div className={styles.patronCount}>
        <span className={styles.countValue}>{patronCount}</span>
        <span className={styles.countLabel}>
          {patronCount === 1 ? 'Patron' : 'Patrons'}
        </span>
      </div>

      {activeGoal && (
        <div className={styles.goal}>
          <div className={styles.goalHeader}>
            <Target size={14} />
            <span>{activeGoal.title}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(activeGoal.completed_percentage, 100)}%` }}
            />
          </div>
          <span className={styles.progressLabel}>
            {Math.round(activeGoal.completed_percentage)}% funded
          </span>
        </div>
      )}

      {tiers.length > 0 && (
        <div className={styles.tiers}>
          <div className={styles.tiersHeader}>Tiers</div>
          {tiers.map((tier) => (
            <div key={tier.title} className={styles.tier}>
              <span className={styles.tierPrice}>
                ${(tier.amount_cents / 100).toFixed(tier.amount_cents % 100 === 0 ? 0 : 2)}
              </span>
              <span className={styles.tierName}>{tier.title}</span>
              {tier.patron_count > 0 && (
                <span className={styles.tierPatrons}>{tier.patron_count}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {members.length > 0 && (
        <div className={styles.members}>
          <div className={styles.membersHeader}>
            <Users size={14} />
            <span>Patrons</span>
          </div>
          {members.map((member) => (
            <div key={member.name} className={styles.member}>
              <span className={styles.memberName}>{member.name}</span>
              {member.tier && (
                <span className={styles.memberTier}>{member.tier}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <a
        href={pledgeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.ctaButton}
      >
        Support on Patreon
        <ExternalLink size={14} />
      </a>
    </div>
  )
}
