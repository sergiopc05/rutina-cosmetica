import { useCallback, useEffect, useState } from 'react'
import type { Profile } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { deviceTimeZone, nowISO } from '@/lib/util'
import { useAuth } from '@/app/AuthProvider'

const CACHE_KEY = 'profile-cache'

function readCache(): Profile | null {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
  } catch {
    return null
  }
}

function writeCache(p: Profile): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(p))
  } catch {
    /* almacenamiento no disponible */
  }
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(readCache)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (data) {
          setProfile(data as Profile)
          writeCache(data as Profile)
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  const update = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .update({ ...patch, updated_at: nowISO() })
        .eq('id', user.id)
        .select()
        .maybeSingle()
      if (data) {
        setProfile(data as Profile)
        writeCache(data as Profile)
      }
    },
    [user],
  )

  return {
    profile,
    timezone: profile?.timezone ?? deviceTimeZone(),
    loading,
    update,
  }
}
