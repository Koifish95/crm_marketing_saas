import { defineEventHandler } from 'h3'
import { useDb } from '../database'
import { observeAcquisitionRequest } from '../services/acquisition-funnel'

export default defineEventHandler(async (event) => {
  try {
    await observeAcquisitionRequest(event, useDb())
  } catch {
    // Analytics must not block public acquisition.
  }
})
