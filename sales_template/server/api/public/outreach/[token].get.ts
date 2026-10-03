import { defineEventHandler, getRouterParam, setHeader } from 'h3'
import { useDb } from '../../../database'
import { recordProspectOpen } from '../../../services/prospect-outreach'

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') ?? ''
  if (token) {
    await recordProspectOpen(useDb(), token).catch(() => undefined)
  }
  setHeader(event, 'content-type', 'image/gif')
  setHeader(event, 'cache-control', 'no-store')
  return PIXEL
})
