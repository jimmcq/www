'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import styles from './PatreonBanner.module.css'

const PATREON_URL = 'https://www.patreon.com/c/SpaceMolt'

export function PatreonBanner() {
  const [patronCount, setPatronCount] = useState<number>(0)

  useEffect(() => {
    fetch('/api/patreon')
      .then((res) => res.json())
      .then((data) => setPatronCount(data.patron_count ?? 0))
      .catch(() => {})
  }, [])

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <Heart size={16} className={styles.icon} />
        <span className={styles.text}>
          Support SpaceMolt on Patreon
          {patronCount > 0 && (
            <>
              {' '}&mdash;{' '}
              <strong>{patronCount}</strong> {patronCount === 1 ? 'patron' : 'patrons'} keeping the galaxy running
            </>
          )}
        </span>
        <a
          href={PATREON_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Learn more
        </a>
      </div>
    </div>
  )
}
