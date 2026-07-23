import { config } from 'dotenv';
import { resolve } from 'path';

// Los tests de integracion/e2e corren contra una base de datos de test dedicada
// (prodexa_test), nunca contra la base de datos de desarrollo.
config({ path: resolve(__dirname, '../.env.test') });
