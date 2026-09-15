export const PRODUCT_IDS = ['martial-arts', 'sales'] as const
export type ProductId = typeof PRODUCT_IDS[number]

export const UNASSIGNED_INDUSTRY = 'unassigned'

export type ProductDefinition = {
  id: ProductId
  displayName: string
  dockerfile: string
  templateDir: string
  composeFile: string
  image: string
  containerPort: number
  healthPath: string
  sqliteInContainer: string
  uploadsInContainer: string
  appNameTemplate: 'acquisition' | 'plain'
  extraEnv: Record<string, string>
}

export const PRODUCTS: Record<ProductId, ProductDefinition> = {
  'martial-arts': {
    id: 'martial-arts',
    displayName: 'Martial Arts',
    dockerfile: 'martial_arts_template/Dockerfile',
    templateDir: 'martial_arts_template',
    composeFile: 'docker-compose.provisioned.yml',
    image: 'martial-arts-acquisition:s4',
    containerPort: 5000,
    healthPath: '/api/health',
    sqliteInContainer: '/app/data/sqlite/crm.sqlite',
    uploadsInContainer: '/app/data/uploads',
    appNameTemplate: 'acquisition',
    extraEnv: {},
  },
  'sales': {
    id: 'sales',
    displayName: 'Sales',
    dockerfile: 'sales_template/Dockerfile',
    templateDir: 'sales_template',
    composeFile: 'docker-compose.provisioned.yml',
    image: 'crm-sales:c2',
    containerPort: 5000,
    healthPath: '/api/health',
    sqliteInContainer: '/app/data/sqlite/crm.sqlite',
    uploadsInContainer: '/app/data/uploads',
    appNameTemplate: 'plain',
    extraEnv: {
      SALES_PROPOSALS_DIR: '/app/data/uploads/proposals',
    },
  },
}

export const MARTIAL_ARTS_PRODUCT = PRODUCTS['martial-arts']
export const SALES_PRODUCT = PRODUCTS.sales
export const PROVISIONED_IMAGE = MARTIAL_ARTS_PRODUCT.image
export const PROVISIONED_COMPOSE_FILE = MARTIAL_ARTS_PRODUCT.composeFile

export function isProductId(value: string): value is ProductId {
  return (PRODUCT_IDS as readonly string[]).includes(value)
}

export function requireProduct(id: string): ProductDefinition {
  if (!isProductId(id)) {
    throw new Error(`Unknown product ${id}.`)
  }
  return PRODUCTS[id]
}

export function listCatalogProducts() {
  return PRODUCT_IDS.map(id => ({
    id,
    displayName: PRODUCTS[id].displayName,
  }))
}

export function backfillInstanceId(customerId: string) {
  return `${customerId}-martial-arts`
}
