import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxListView, BOX_LIST_META } from '@/components/box-list-view'
import { loadBoxList } from '@/lib/api/box-list'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { nickname, items } = await loadBoxList(supabase, user.id, 'favorites')
  return <BoxListView {...BOX_LIST_META.favorites} nickname={nickname} items={items} />
}
