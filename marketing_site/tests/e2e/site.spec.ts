import { expect, test } from '@playwright/test'

const routes = ['/', '/product', '/how-it-works', '/about', '/demo', '/privacy', '/terms']

test('every commercial route loads', async ({ page }) => {
  for (const path of routes) {
    const response = await page.goto(path)
    expect(response?.ok()).toBeTruthy()
    await expect(page.locator('h1')).toBeVisible()
  }
})

test('header has no login and reaches the demo form', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Request a Demo' }).first()).toBeVisible()
  await page.goto('/demo')
  await expect(page.locator('input[name="website"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Request a Demo' }).click()
  await expect(page.getByText('Enter your name.')).toBeVisible()
  await page.getByLabel('Name').fill('Avery Chen')
  await page.getByLabel('Academy').fill('Northshore Martial Arts')
  await page.getByLabel('Email').fill('avery@northshore.example')
  await page.getByLabel('Phone').fill('8015550142')
  await page.getByRole('button', { name: 'Request a Demo' }).click()
  await expect(page.getByRole('status')).toContainText('Request received.')
})
