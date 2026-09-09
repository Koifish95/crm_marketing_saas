export default defineEventHandler(async (event) => {
  const user = await requireAdminUser(event)
  return { ok: true, role: user.role }
})
