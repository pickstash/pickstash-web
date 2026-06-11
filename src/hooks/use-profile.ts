'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile } from '@/lib/api/profiles'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return userId
}

export function useProfile() {
  const userId = useCurrentUserId()

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const userId = useCurrentUserId()

  return useMutation({
    mutationFn: (update: Parameters<typeof updateProfile>[1]) =>
      updateProfile(userId!, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })
}
