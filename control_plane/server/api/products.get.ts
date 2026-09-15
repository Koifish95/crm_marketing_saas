import { listCatalogProducts } from '../products/catalog'

export default defineEventHandler(() => {
  return { products: listCatalogProducts() }
})
