
import { neon } from '@neondatabase/serverless'
import {drizzle} from 'drizzle-orm/neon-http'
import * as schema from './schema'


//we create a .env file and store the neon url

//hold connection to our neon db
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, {schema});

