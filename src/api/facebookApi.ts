import { config } from '../config/env'
import { FacebookPost } from '../types/common.types'

interface FacebookApiResponse {
  data: Array<{
    id: string
    message?: string
    full_picture?: string
    created_time: string
    permalink_url: string
    likes?: { summary: { total_count: number } }
    comments?: { summary: { total_count: number } }
  }>
}

export async function getFacebookPosts(limit: number = 6): Promise<FacebookPost[]> {
  if (!config.fbAccessToken) {
    console.warn('Facebook access token not configured')
    return []
  }

  const fields = 'id,message,full_picture,created_time,permalink_url,likes.summary(true),comments.summary(true)'
  const url = `https://graph.facebook.com/v18.0/${config.fbPageId}/posts?fields=${fields}&limit=${limit}&access_token=${config.fbAccessToken}`

  try {
    const response = await fetch(url)
    const data: FacebookApiResponse = await response.json()

    return data.data.map(post => ({
      id: post.id,
      message: post.message || '',
      image: post.full_picture,
      createdAt: new Date(post.created_time),
      url: post.permalink_url,
      likes: post.likes?.summary?.total_count || 0,
      comments: post.comments?.summary?.total_count || 0,
    }))
  } catch (error) {
    console.error('Failed to fetch Facebook posts:', error)
    return []
  }
}
