import axios, { AxiosInstance } from 'axios';
import { getSystemSettings } from '@/lib/systemSettings';

let cachedApi: AxiosInstance | null = null;
let cachedKey: string | null = null;

async function getApi() {
  const settings = await getSystemSettings();
  const baseUrl = settings.dynmslApiBaseUrl || process.env.DYNMSL_API_BASE_URL || 'https://mail.dynmsl.com/api/public';
  const apiToken = settings.dynmslApiToken || process.env.DYNMSL_API_TOKEN;
  if (!apiToken) {
    throw new Error('Missing DYNMSL_API_TOKEN');
  }

  const key = `${baseUrl}::${apiToken}`;
  if (cachedApi && cachedKey === key) return cachedApi;
  cachedKey = key;
  cachedApi = axios.create({
    baseURL: baseUrl,
    headers: {
      Authorization: apiToken,
      'Content-Type': 'application/json',
    },
  });
  return cachedApi;
}

export interface EmailListParams {
  toEmail: string;
}

export const getEmailList = async (params: EmailListParams) => {
  try {
    const response = await (await getApi()).post('/emailList', params);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export interface AddUserParams {
  list: { email: string; password: string }[];
}

export const addUsers = async (params: AddUserParams) => {
  try {
    const response = await (await getApi()).post('/addUser', params);
    return response.data;
  } catch (error) {
    throw error;
  }
};
