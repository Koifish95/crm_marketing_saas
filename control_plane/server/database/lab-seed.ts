export const LAB_CUSTOMER_SLUG = 'lab-acme'
export const LAB_NODE_NAME = 'laptop'
export const EXPECTED_IMAGE = 'martial-arts-acquisition:s2'

export const LAB_ENVIRONMENTS = [
  {
    type: 'PROD',
    displayName: 'PROD',
    slug: 'lab-acme-prod',
    containerName: 'lab-acme-prod-app',
    composeProject: 'lab-acme-prod',
    composeFile: 'docker-compose.lab-acme-prod.yml',
    envFileLocal: '.env.lab-acme-prod',
    envFileExample: '.env.lab-acme-prod.example',
    healthUrl: 'http://127.0.0.1:52040/api/health',
    hostPort: 52040,
    sqliteVolume: 'lab-acme-prod-sqlite',
    assetsVolume: 'lab-acme-prod-assets',
    isolationMarker: 'm10a-prod-isolation',
  },
  {
    type: 'DEV',
    displayName: 'DEV',
    slug: 'lab-acme-dev',
    containerName: 'lab-acme-dev-app',
    composeProject: 'lab-acme-dev',
    composeFile: 'docker-compose.lab-acme-dev.yml',
    envFileLocal: '.env.lab-acme-dev',
    envFileExample: '.env.lab-acme-dev.example',
    healthUrl: 'http://127.0.0.1:52050/api/health',
    hostPort: 52050,
    sqliteVolume: 'lab-acme-dev-sqlite',
    assetsVolume: 'lab-acme-dev-assets',
    isolationMarker: 'm10a-dev-isolation',
  },
] as const
