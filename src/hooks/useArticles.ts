import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import type { Article } from '../lib/types'

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('articles')
      .select('*')
      .order('category', { nullsFirst: false })
      .order('name')
    if (err) setError(err.message)
    else setArticles(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  const createArticle = async (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error: err } = await supabase
      .from('articles')
      .insert(article)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setArticles(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    logAction({ action: 'crear', entityType: 'articulo', entityId: data.id, entityName: data.name })
    return data as Article
  }

  const updateArticle = async (id: string, updates: Partial<Article>) => {
    const { data, error: err } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setArticles(prev => prev.map(a => (a.id === id ? data : a)))
    logAction({ action: 'actualizar', entityType: 'articulo', entityId: id })
    return data as Article
  }

  const deleteArticle = async (id: string) => {
    const article = articles.find(a => a.id === id)
    const { error: err } = await supabase.from('articles').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setArticles(prev => prev.filter(a => a.id !== id))
    logAction({ action: 'eliminar', entityType: 'articulo', entityId: id, entityName: article?.name })
  }

  const categories = Array.from(
    new Set(articles.map(a => a.category).filter((c): c is string => !!c))
  ).sort()

  return {
    articles, loading, error, categories,
    refetch: fetchArticles,
    createArticle, updateArticle, deleteArticle,
  }
}
