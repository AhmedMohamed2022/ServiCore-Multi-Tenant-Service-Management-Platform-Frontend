import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiBaseUrl = process.env.SERVICORE_API_BASE_URL?.trim();

if (!apiBaseUrl) {
  throw new Error(
    'SERVICORE_API_BASE_URL is required for a production build.'
  );
}

if (!/^https:\/\//i.test(apiBaseUrl)) {
  throw new Error('SERVICORE_API_BASE_URL must use HTTPS in production.');
}

const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, '');

const content = `export const environment = {
  production: true,
  apiBaseUrl: ${JSON.stringify(normalizedApiBaseUrl)},
};
`;

writeFileSync(
  resolve('src/environments/environment.ts'),
  content,
  'utf8'
);
